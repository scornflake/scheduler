import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger, LoggingService} from "ionic-logging-service";
import {NamedObject, ObjectWithUUID, TypedObject} from "../../scheduling/base-types";
import 'reflect-metadata';
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {isUndefined} from "util";
import {ObjectChange, ObjectChangeTracker} from "../mapping/orm-change-detection";
import {Subject} from "rxjs/Subject";
import {debounceTime} from "rxjs/operators";
import {GenericManager} from "../../scheduling/common/scheduler-store";
import {OrmMapper,} from "../mapping/orm-mapper";
import {IObjectStore} from "../mapping/orm-mapper-type";

import {OrmConverter} from "./orm-converter";
import {IObjectCache} from "../mapping/cache";
import {action} from "mobx-angular";
import {Organization} from "../../scheduling/organization";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {StoreBasedResolver} from "./orm-resolver";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Observable} from "rxjs/Observable";
import {StateProvider} from "../state/state";
import Database = PouchDB.Database;
import DatabaseConfiguration = PouchDB.Configuration.DatabaseConfiguration;

export interface IReplicationNotification {
    asyncTokenRejectedInContinuousReplication(): Promise<boolean>;

    tokenCouldNotBeRefreshedDuringReplication();
}

enum SavingState {
    Idle = 0,  // No changes
    ChangeDetected = 1, // changes were begun
    StartedSaving = 2, // changes were begun
    FinishedSaving = 3, // changes completed ok!
}

enum ReplicationStatus {
    Unknown = 0,
    ProcessingPull,
    Paused,
    Idle
}

class SchedulerDatabase implements IObjectStore {
    saveNotifications$ = new Subject<SavingState>();
    replicationNotifications$ = new BehaviorSubject<ReplicationStatus>(ReplicationStatus.Unknown);

    readyEvent: Subject<boolean>;
    info: PouchDB.Core.DatabaseInfo;

    logger: Logger;

    private db: Database<{}>;
    private server_db: PouchDB.Database<{}>;
    private server_sync: PouchDB.Replication.Sync<{}>;

    private current_indexes: PouchDB.Find.GetIndexesResponse<{}>;
    private dbName: string;
    private tracker: ObjectChangeTracker;
    private mapper: OrmMapper;
    private _converter: OrmConverter;
    private _state: StateProvider;
    private _cache: IObjectCache;
    private _delegate: IReplicationNotification;

    lastSeenReplicationStatus: ReplicationStatus = ReplicationStatus.Unknown;

    constructor(dbName: string, state: StateProvider, mapper: OrmMapper, logService: LoggingService) {
        this.dbName = dbName;
        this.mapper = mapper;
        this._state = state;
        this.logger = logService.getLogger("db");

        let resolver = new StoreBasedResolver(this, logService, mapper);
        this._converter = new OrmConverter(this.mapper, this, logService, null, resolver);
        PouchDB.plugin(PouchDBFind);

        this.readyEvent = new ReplaySubject(1);
        this.tracker = new ObjectChangeTracker(this.mapper, logService);

        this.initialize().then();
        this.readyEvent.subscribe(r => {
            this.logger.info(`DB ${this.dbName} ready: ${r}`);
        });

        // This is so we can output a single stream of 'idle, change waiting, saving/done'
        this.tracker.changes.subscribe(() => {
            this.saveNotifications$.next(SavingState.ChangeDetected);
        });

        // This is so we can kick off a save some time after the change occurs
        let changes = this.tracker.changes.pipe(
            debounceTime(1500)
        );
        changes.subscribe(this.trackerNotification.bind(this));
    }

    get changes$(): Subject<ObjectChange> {
        if (!this.tracker) {
            throw new Error(`cant get changes$, there's no tracker`);
        }
        if (!this.tracker.changes) {
            throw new Error(`cant get changes$, there's no changes subject on the tracker`);
        }
        return this.tracker.changes;
    }

    static ConstructAndWait(dbName: string, state: StateProvider, mapper: OrmMapper, logService: LoggingService): Promise<SchedulerDatabase> {
        return new Promise<SchedulerDatabase>((resolve) => {
            let instance = new SchedulerDatabase(dbName, state, mapper, logService);
            // instance.logger.info("Starting DB setup for TEST");
            instance.readyEvent.subscribe(() => {
                resolve(instance);
            })
        });
    }

    // valueOf() {
    //     return `Name:${this.dbName}`;
    // }

    get name(): string {
        return this.dbName;
    }

    get cache(): IObjectCache {
        return this._cache;
    }

    get converter(): OrmConverter {
        return this._converter;
    }

    get localPouchOptions(): DatabaseConfiguration {
        return {
            skip_setup: true,
        };
    }

    get remoteCouchOptions() {
        return {
            fetch: (url, opts) => {
                if (this._state && this._state.loginToken) {
                    // console.log(`POUCH adding Authorization token to headers!`);
                    opts.headers.set('Authorization', 'Bearer ' + this._state.loginToken);
                }
                this.logger.debug("remoteCouchOptions", `Fetching: ${url} with ${opts}`);
                try {
                    return PouchDB.fetch(url, opts).catch(err => {
                        this.logger.error("remoteCouchOptions", `Error Fetching: ${url} with ${opts}, ${err}`);
                        // If it is status == 401, don't throw it!
                        if (err['status'] == 401) {
                            // ignore
                        } else {
                            // ignore as well, for now, since we're getting odd rejection msgs in browser?
                            // throw err;
                        }
                    });
                } catch(error) {
                    this.logger.error(`Exception during remoteCouchOptions.fetch: ${SWBSafeJSON.stringify(error)}`);
                }
            }
        }
    }

    async initialize() {
        // Put this back in when we move to v7 of Pouch.
        // let options = {adapter: 'idb'};
        // PouchDB.plugin(plugin);
        this.logger.info('initialize', `Creating new DB instance: ${this.dbName} ...`);
        this.db = await new PouchDB(this.dbName, this.localPouchOptions);

        this.logger.debug("Getting DB information");
        this.info = await this.db.info();
        this.logger.debug(`DB: ${this.info.db_name}. ${this.info.doc_count} docs.`);
        await this.setupIndexes();

        this.logger.info('initialize', `Initialize for ${this.dbName} done`);
        this.readyEvent.next(true);
    }

    async setupIndexes() {
        this.logger.debug("Checking indexes...");
        this.logger.debug("Getting existing indexes...");

        this.current_indexes = await this.db.getIndexes();
        this.logger.debug(`DB has indexes ${this.current_indexes.indexes.map(i => i.name).join(', ')}`);
        if (!this.index_exists('type')) {
            this.logger.debug("Creating index: type");
            await this.db.createIndex({index: {name: 'type', fields: ['type']}});
            await this.db.createIndex({index: {name: 'type and email', fields: ['type', 'email']}});
        }
    }

    async deleteAllContentFromDatabase(skipOver: string[]) {
        this.tracker.clearAll();

        // We don't stop replication. The whole point here, is to delete EVERYTHING
        let theDocs = await this.db.allDocs();

        let deleteCommand = [];
        for (let doc of theDocs.rows) {
            // delete the object directly
            if (doc['id'].startsWith('_design')) {
                this.logger.info(`Skipped design doc: ${doc['id']}`);
                continue;
            }
            if (doc['id'] && doc['value']) {

                // If it's "us", or our preferences, don't delete
                if (skipOver.indexOf(doc['id']) != -1) {
                    this.logger.info(`Skipped ${doc['id']}`);
                    continue;
                }

                if (doc['value']['rev']) {
                    this.logger.info(`delete: ${SWBSafeJSON.stringify(doc)}`);
                    deleteCommand.push({
                        _id: doc['id'],
                        _rev: doc['value']['rev'],
                        _deleted: true
                    })
                }
            }
        }

        await this.db.bulkDocs(deleteCommand);
    }

    async destroyDatabase() {
        this.tracker.clearAll();

        await this.asyncStopReplication(true);

        // let allDocIds = await this.db.allDocs({include_docs: false});
        // let idsWithDeleted = allDocIds.rows.map(doc => {
        //     return {"_id": doc.id, "_deleted": "true"}
        // });
        // await this.db.bulkDocs();
        // await this.db.compact({});

        await this.db.destroy();
    }

    private index_exists(name: string): boolean {
        return this.current_indexes.indexes.find(idx => idx.name == name) != null;
    }

    async async_docWithUUID(uuid: string) {
        return await this.db.get(uuid);
    }

    @action
    async async_LoadObjectWithUUID(id: string, useCache: boolean = true, nesting: number = 0): Promise<ObjectWithUUID> {
        if (isUndefined(id)) {
            throw new Error("load_object_with_id failed. You must pass in an id (you passed in 'undefined')");
        }

        if (useCache && this._cache) {
            let fromCache = this._cache.getFromCache(id);
            if (fromCache) {
                return fromCache;
            }
        }

        try {
            let doc = await this.db.get(id);
            this.logger.debug(`Doc for loaded object: ${SWBSafeJSON.stringify(doc)}`);
            if (doc['type']) {
                let object_type = doc['type'];
                this.persistence_debug(`load object ${id}, type: ${object_type}`, nesting);
                let instance = await this._converter.reader.async_createJSObjectFromDoc(doc, object_type, nesting);
                return this.trackChanges(instance);
            }
        } catch (err) {
            if (err.status == 404) {
                return null;
            }
            throw err;
        }
        throw new Error(`Loaded doc from store with id ${id}, but it doesn't have a 'type' field. Don't know how to turn it into an object!`);
    }

    gap(width: number): string {
        return " ".repeat(width);
    }

    persistence_debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

    addDBSpecificPropertiesToDict(dict: object, obj: any, nesting: number) {
        return this._convert_add_type_id_and_rev(dict, obj, false, nesting);
    }

    private _convert_add_type_id_and_rev(dict, value, include_id_and_rev: boolean = false, nesting: number = 0) {
        let messages = [];
        if (value instanceof TypedObject) {
            if (dict.type != value.type) {
                messages.push(`set type to be ${value.type}`);
                dict.type = value.type;
            }
            if (value instanceof ObjectWithUUID && include_id_and_rev) {
                messages.push(`set _id=${value._id} and _rev=${value._rev}`);
                dict._id = value._id;
                dict._rev = value._rev;
            }
            if (messages.length) {
                this.persistence_debug(messages.join(", "), nesting);
            }
        }
        return dict;
    }


    async async_DoesObjectExistWithUUID(id: string): Promise<boolean> {
        try {
            await this.db.get(id);
            return true;
        } catch (ex) {
            if (ex.hasOwnProperty('status')) {
                /*
                Check for a known 404. If we understand and succeed, then swallow this exception, otherwise propagate it.
                 */
                let status = ex['status'];
                if (status == 404) {
                    // We know for certain it doesn't exist.
                    return false;
                }
            } else {
                console.error(`Exception while testing if object exists: ${JSON.stringify(ex)}`);
            }
            throw ex;
        }
    }

    @action
    async async_storeOrUpdateObject(object: ObjectWithUUID, force_rev_check: boolean = false, ignore_not_found: boolean = false): Promise<ObjectWithUUID> {
        // Get the latest rev
        if (object == null || isUndefined(object)) {
            throw new Error("Trying to save nothing / undefined?");
        }

        this.tracker.disableTrackingFor(object);
        this.saveNotifications$.next(SavingState.StartedSaving);
        try {
            let object_state = object.is_new ? "new" : "existing";
            if (object.is_new == false || force_rev_check) {
                try {
                    let existing = await this.db.get(object._id);
                    if (existing._rev != object._rev) {
                        // better update it!
                        this.logger.warn(`Updating rev on ${object} because the server is different (this could overwrite new changes)`);
                        object.setRev(existing._rev);
                    }
                } catch (err) {
                    if (!ignore_not_found) {
                        this.logger.error(`Cannot update ${object_state} doc (cannot be read from the db, was it deleted?), ${err}`);
                        return;
                    }
                }
            }

            let dict_of_object = await this._converter.writer.async_createDocFromJSObject(object);
            dict_of_object = this._convert_add_type_id_and_rev(dict_of_object, object, true);
            this.logger.debug(`About to 'put' dict '${dict_of_object}' from type ${object.type}`);
            try {
                let response = await this.db.put(dict_of_object);

                this.logger.debug(`Stored ${object_state} object ${object.type} with new ID: ${object._id}`);
                if (object._id != response.id) {
                    object.setId(response.id);
                }
                if (object._rev != response.rev) {
                    object.setRev(response.rev);
                }
                if (object.is_new) {
                    object.setIsNew(false);
                }
                this.trackChanges(object);
                return object;
            } catch (err) {
                this.logger.debug(`Failed to store entity. Err: ${err}. Data: ${SWBSafeJSON.stringify(dict_of_object)}`);
                throw Error(`Exception while storing ${object_state} ${object.type}. ${err}. id: ${object.uuid}. Tried to store: ${JSON.stringify(dict_of_object)}`);
            }
        } finally {
            this.tracker.enableTrackingFor(object);
            this.saveNotifications$.next(SavingState.FinishedSaving);
        }
    }


    @action
    async async_load_and_create_objects_for_query(query) {
        let all_objects_of_type = await this.db.find(query);
        this.persistence_debug(`Hydrating ${all_objects_of_type.docs.length} objects, for query: ${query}`, 0);
        return await this.convert_docs_to_objects_and_store_in_cache(all_objects_of_type.docs);
    }

    @action
    async convert_docs_to_objects_and_store_in_cache(docs: Array<any>): Promise<Array<ObjectWithUUID>> {
        let list_of_new_things = [];
        for (let doc of docs) {
            let docId = doc['_id'];
            if (docId.startsWith("_design/")) {
                continue;
            }

            if (doc['_deleted']) {
                this._cache.evict(docId);
                this.logger.info(`Evicted ${docId} from cache.`);
                continue;
            }

            let type = doc['type'];
            if (!type) {
                this.logger.error(`ERROR processing doc ID: ${docId}. No TYPE information. This was skipped.`);
                this.logger.error(`DOC was: ${SWBSafeJSON.stringify(doc)}`);
                continue;
            }
            let new_object = null;
            try {
                this.tracker.disableTrackingFor(docId);
                try {
                    new_object = await this._converter.reader.async_createJSObjectFromDoc(doc, type);
                }
                catch (err) {
                    let message = `ERROR creating JS from dict, doc ID: ${docId}, ${err}`;
                    this.logger.error(message);
                    this.logger.error(`DOC was: ${SWBSafeJSON.stringify(doc)}`);
                    throw new Error(message);
                }
                if (new_object) {
                    list_of_new_things.push(new_object);
                    try {
                        this.trackChanges(new_object);
                    } catch (err) {
                        let message = `ERROR tracking new document, doc ID: ${docId}, ${err}`;
                        this.logger.error(message);
                        this.logger.error(`DOC was: ${SWBSafeJSON.stringify(doc)}`);
                        throw new Error(message);
                    }
                    this.storeInCache(new_object);
                }
            } finally {
                this.tracker.enableTrackingFor(docId);
            }
        }
        // this.logger.info(`converted ${docs.length} docs into ${list_of_new_things.length} objects`);
        return list_of_new_things;
    }

    @action
    async async_load_all_objects_of_type(type: string) {
        let query = {selector: {type: type}};
        return await this.async_load_and_create_objects_for_query(query);
    }

    @action
    async async_load_into_store<T extends NamedObject>(manager: GenericManager<T>, type: string, log_result: boolean = false) {
        let loaded_objects = await this.async_load_all_objects_of_type(type);
        if (log_result) {
            this.logger.info(`Loaded ${loaded_objects.length} objects. # before load: ${manager.length}`);
        }
        let added: number = 0;
        loaded_objects.forEach(o => {
            let ooo = o as T;
            if (ooo) {
                // this adds it into the store as well, by virtue of the store being the cache
                this.trackChanges(ooo);
                added++;
            } else {
                this.logger.warn(`Skipped ${o} because its not of the expected type: ${type}`);
            }
        });
        if (log_result) {
            this.logger.info(`Added ${added} objects to manager # after load: ${manager.length}`);
        }
        return loaded_objects;
    }

    @action
    async asyncDeleteObject(object: ObjectWithUUID) {
        if (object.is_new) {
            throw new Error("Cannot remove object that is 'new' and hasn't been saved yet");
        }

        // We do these first. Optimistic!
        if (this._cache) {
            this._cache.evict(object);
        }
        this.tracker.untrack(object);

        // First, get the latest revision number.
        let existing = await this.db.get(object.uuid);
        if (existing) {
            if (existing._rev != object._rev) {
                this.logger.warn(`Updated _rev from ${object._rev} => ${existing._rev} before delete, otherwise we'd get a document conflict (but we may be loosing data)`);
                object._rev = existing._rev;
            } else {
                this.logger.warn(`_rev's match, delete should be OK! ${object._rev} == ${existing._rev}`);
            }
        } else {
            this.logger.warn(`Couldn't check the _rev of ${object.uuid}. It doesn't exist?!`);
        }
        return await this.db.remove({_id: object.uuid, _rev: object._rev});
    }

    trackChanges(object: any): ObjectWithUUID {
        if (object instanceof ObjectWithUUID) {
            this.storeInCache(object);
            this.tracker.track(object);
        }
        return object;
    }

    @action storeInCache(object: ObjectWithUUID) {
        if (this._cache && object) {
            this._cache.saveInCache(object);
        }
    }

    async trackerNotification(thing: ObjectChange) {
        // Don't worry about the changes per-say, since we're using debounce.
        // Just go ask the tracker what objects we should save
        for (let owner of Array.from(this.tracker.getChangedObjects().values())) {
            if (owner instanceof ObjectWithUUID) {
                let owuid = owner as ObjectWithUUID;
                await this.async_storeOrUpdateObject(owuid).then(() => {
                    this.logger.info(`Save object: ${owuid.uuid}`);
                    this.tracker.clearChangesFor(owuid);
                });
            }
        }
    }

    setCache(cache: IObjectCache) {
        this._cache = cache;
        this._converter.cache = cache;
    }

    async findBySelector<T extends ObjectWithUUID>(selector: any, expectOne: boolean = false): Promise<T[]> {
        let all_objects_of_type = await this.db.find(selector);
        if (all_objects_of_type.docs.length) {
            if (all_objects_of_type.docs.length > 1 && expectOne) {
                throw new Error(`Query ${JSON.stringify(selector)} returned more than one match`)
            }
            return await this.convert_docs_to_objects_and_store_in_cache(all_objects_of_type.docs) as T[];
        }
        return null;
    }

    async asyncStopReplication(destroy: boolean = false) {
        this.stopContinuousReplication();
        if (this.server_db) {
            if (destroy) {
                await this.server_db.destroy();
            } else {
                await this.server_db.close();
            }
            this.server_db = null;
        }
    }

    private stopContinuousReplication() {
        if (this.server_sync) {
            this.server_sync.cancel();
            this.server_sync = null;
        }
    }

    async startReplicationFor(serverUrl: string, organizationUUID: string) {
        if (!organizationUUID || !serverUrl) {
            throw new Error(`Cannot start replication: serverUrl/organization not provided`);
        }
        let remoteDBName = Organization.dbNameFor(organizationUUID);
        this.logger.info('startReplicationFor', `Starting replication for ${remoteDBName}`);
        await this._startReplication(serverUrl, remoteDBName);
        this.logger.info('startReplicationFor', `Started replication for ${remoteDBName}`);
    }

    private async _startReplication(serverUrl: string, remoteDBName: string) {
        if (!serverUrl) {
            throw new Error(`Cannot begin replication without remote DB server url being specified.`);
        }
        if (!remoteDBName) {
            throw new Error(`Cannot begin replication without remote DB name being specified.`);
        }
        if (this.server_db) {
            this.logger.warn(`Replication already started, ignored`);
        }

        this.logger.info(`Using token ${this._state.loginToken}`);
        this.server_db = new PouchDB(`${serverUrl}/${remoteDBName}`, this.remoteCouchOptions);

        // Do a single non-live sync first, to get all the data into our local store.
        // Wait for this initial sync to complete.
        let observable = Observable.create(obs => {
            this.db.sync(this.server_db, {retry: true}, () => {
                // this.db.sync(this.server_db, {retry: true, filter: "docsonly/docsonly"}, () => {
                this.logger.info(`Initial replication complete`);
                this.startContinuousReplication();
                this.lastSeenReplicationStatus = ReplicationStatus.Idle;
                this.replicationNotifications$.next(this.lastSeenReplicationStatus);
                obs.complete();
            }).on('change', (change) => {
                this.lastSeenReplicationStatus = ReplicationStatus.ProcessingPull;
                this.saveNotifications$.next(SavingState.FinishedSaving);
                obs.next(change);
            }).on('denied', (err) => {
                this.logger.error(SWBSafeJSON.stringify(err));
                obs.error(SWBSafeJSON.stringify(err));
                obs.complete();
            }).on('error', (err) => {
                this.logger.error(SWBSafeJSON.stringify(err));
                obs.error(SWBSafeJSON.stringify(err));
                obs.complete();
            }).on('complete', (info) => {
                // this.logger.warn(`NOTIFICATION: Initial replication complete`);
                obs.complete();
            });
        });
        return observable.toPromise();
    }

    private startContinuousReplication() {
        // Now start continuous replication.
        this.logger.info(`Starting continuous replication...`);
        this.server_sync = this.db.sync(this.server_db, {live: true, retry: true, filter: "filters/docsonly"})
            .on('change', (change) => {
                this.lastSeenReplicationStatus = ReplicationStatus.ProcessingPull;
                this.saveNotifications$.next(SavingState.FinishedSaving);
                if (change['direction'] == 'pull') {
                    let data = change.change;
                    let docs = data.docs;

                    // remove the _revisions, so the logging doesn't SUCK
                    this.logger.info(`Remove any _revisions...`);
                    for (let doc of docs) {
                        delete doc['_revisions'];
                    }

                    let changeInfo = {};
                    this.logger.info(`Ponder changeInfo...: ${JSON.stringify(docs)}`);
                    if (docs && Array.isArray(docs)) {
                        changeInfo['num_docs'] = docs.length;
                    } else {
                        changeInfo = change;
                    }

                    this.logger.info(`Processing incoming change: ${JSON.stringify(changeInfo)}`);

                    // Want to update existing store using this data, as though we had read it direct from the DB
                    this.saveNotifications$.next(SavingState.ChangeDetected);

                    this.convert_docs_to_objects_and_store_in_cache(docs).then((items) => {
                        this.logger.info(` ... incoming change (${items.length} docs) processed and stored in DB/cache`);
                    });
                    this.saveNotifications$.next(SavingState.FinishedSaving);
                    this.replicationNotifications$.next(this.lastSeenReplicationStatus);
                }
            })
            .on('paused', (info) => {
                this.logger.debug(`Replication paused`);
                this.lastSeenReplicationStatus = ReplicationStatus.Paused;
                this.replicationNotifications$.next(this.lastSeenReplicationStatus);
            })
            .on('complete', (info) => {
                this.logger.debug(`Replication complete, ${JSON.stringify(info)}`);
                this.lastSeenReplicationStatus = ReplicationStatus.Idle;
                this.replicationNotifications$.next(this.lastSeenReplicationStatus);
            })
            .on('denied', (info) => {
                this.logger.error(`Replication denied! ${JSON.stringify(info)}`);
            })
            .on('error', (err) => {
                /*
                21:32:15,898 db Replication error: {"status":401,"name":"unauthorized","message":"[\"Token Rejected\",token_rejected]","reason":"[\"Token Rejected\",token_rejected]"}
                 */
                if (err['status'] == 401) {
                    // Try to refresh the token
                    if (this._delegate) {
                        this._delegate.asyncTokenRejectedInContinuousReplication().then(r => {
                            if (r) {
                                // making sure to clean up
                                this.stopContinuousReplication();
                                this.startContinuousReplication();
                            } else {
                                this._delegate.tokenCouldNotBeRefreshedDuringReplication()
                            }
                        })
                    }
                } else {
                    this.logger.error(`Replication error: ${err}. Replication has stopped.`);
                }
            });
        this.lastSeenReplicationStatus = ReplicationStatus.Idle;
        this.replicationNotifications$.next(this.lastSeenReplicationStatus);
        this.logger.debug(`Sync started`);
    }

    async storeRawDocs(docs) {
        return await this.db.bulkDocs(docs);
    }

    set notificationDelegate(aDelegate: IReplicationNotification) {
        this._delegate = aDelegate;
    }

    async asyncCleanUp() {
        await this.asyncStopReplication();

        this.tracker = null;
        this.mapper = null;
        this._converter = null;
        this._cache = null;
        this._state = null;
        this._delegate = null;
    }
}

export {
    SchedulerDatabase,
    SavingState,
    ReplicationStatus
}