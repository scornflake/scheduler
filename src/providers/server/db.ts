import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger} from "ionic-logging-service";
import {TypedObject, NamedObject, ObjectWithUUID} from "../../scheduling/base-types";
import 'reflect-metadata';
import {SafeJSON} from "../../common/json/safe-stringify";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {ConfigurationService} from "ionic-configuration-service";
import {isUndefined} from "util";
import {ObjectChange, ObjectChangeTracker} from "../mapping/orm-change-detection";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Rx";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {debounceTime} from "rxjs/operators";
import {GenericManager} from "../../scheduling/common/scheduler-store";
import {OrmMapper,} from "../mapping/orm-mapper";
import {IObjectLoader} from "../mapping/orm-mapper-type";

import {OrmConverter} from "./orm-converter";
import {IObjectCache} from "../mapping/cache";
import Database = PouchDB.Database;

enum SavingState {
    Idle = 0,  // No changes
    ChangeDetected = 1, // changes were begun
    StartedSaving = 2, // changes were begun
    FinishedSaving = 3, // changes completed ok!
}

@Injectable()
class SchedulerDatabase implements IObjectLoader {
    save_notifications = new Subject<SavingState>();
    ready_event: Subject<boolean>;
    info: PouchDB.Core.DatabaseInfo;

    logger: Logger;

    private db: Database<{}>;
    private is_ready: boolean = false;
    private current_indexes: PouchDB.Find.GetIndexesResponse<{}>;
    private db_name: string;
    private tracker: ObjectChangeTracker;
    private mapper: OrmMapper;
    private _converter: OrmConverter;
    private cache: IObjectCache;

    static ConstructAndWait(configService: ConfigurationService, mapper: OrmMapper): Promise<SchedulerDatabase> {
        return new Promise<SchedulerDatabase>((resolve) => {
            let instance = new SchedulerDatabase(configService, mapper);
            instance.logger.info("Starting DB setup for TEST");
            instance.ready_event.subscribe(() => {
                resolve(instance);
            })
        });
    }

    constructor(configService: ConfigurationService, mapper: OrmMapper) {
        let db_config = configService.getValue("database");

        this.mapper = mapper;
        this._converter = new OrmConverter(this.mapper, this);
        this.db_name = db_config['name'];
        this.logger = LoggingWrapper.getLogger("db");
        PouchDB.plugin(PouchDBFind);

        this.logger.info(`Setting up database: ${this.db_name} ...`);

        this.ready_event = new ReplaySubject();
        this.tracker = new ObjectChangeTracker(this.mapper);

        this.initialize().then(() => {
            this.logger.debug(`DB initialize() done`);
        });

        // This is so we can output a single stream of 'idle, change waiting, saving/done'
        this.tracker.changes.subscribe(() => {
            this.save_notifications.next(SavingState.ChangeDetected);
        });

        // This is so we can kick off a save some time after the change occurs
        let changes = this.tracker.changes.pipe(
            debounceTime(1500)
        );
        changes.subscribe(this.trackerNotification.bind(this));

        this.ready_event.subscribe(val => {
            if (val) {
                this.logger.info("DB is ready");
            } else {
                this.logger.info("DB is NOT ready");
            }
        });
    }

    get converter(): OrmConverter {
        return this._converter;
    }

    async initialize() {
        this.db = await new PouchDB(this.db_name);

        this.logger.info("Getting DB information");
        this.info = await this.db.info();
        this.logger.info(`DB: ${this.info.db_name}. ${this.info.doc_count} docs.`);
        await this.setup_indexes();

        this.is_ready = true;

        Observable.create(obs => obs.next(true)).subscribe(this.ready_event);
    }

    async setup_indexes() {
        this.logger.info("Checking indexes...");
        this.logger.info("Getting existing indexes...");

        this.current_indexes = await this.db.getIndexes();
        this.logger.info(`DB has indexes ${this.current_indexes.indexes.map(i => i.name).join(', ')}`);
        if (!this.index_exists('type')) {
            this.logger.info("Creating index: type");
            await this.db.createIndex({index: {name: 'type', fields: ['type']}});
        }
    }

    async delete_all() {
        this.tracker.clearAll();
        await this.db.destroy();

        /*
        Must reload the page / app, to get a new DB.
         */
        location.reload();
    }

    private index_exists(name: string): boolean {
        return this.current_indexes.indexes.find(idx => idx.name == name) != null;
    }

    async async_load_object_with_id(id: string, useCache: boolean = true, nesting: number = 0): Promise<TypedObject> {
        if (isUndefined(id)) {
            throw new Error("load_object_with_id failed. You must pass in an id (you passed in 'undefined')");
        }

        if (useCache && this.cache) {
            let fromCache = this.cache.getFromCache(id);
            if (fromCache) {
                return fromCache;
            }
        }

        let doc = await this.db.get(id);
        this.logger.debug(`Doc for loaded object: ${SafeJSON.stringify(doc)}`);
        if (doc['type']) {
            let object_type = doc['type'];
            this.persistence_debug(`load object ${id}, type: ${object_type}`, nesting);
            let instance = await this._converter.async_create_js_object_from_dict(doc, object_type, nesting);
            return this.trackChanges(instance);
        }
        throw new Error(`Loaded doc from store with id ${id}, but it doesn't have a 'type' field. Don't know how to turn it into an object!`);
    }

    gap(width: number): string {
        return " ".repeat(width);
    }

    persistence_debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

    add_db_specific_properties_to_dict(dict: object, obj: any, nesting: number) {
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


    async async_does_object_with_id_exist(id: string): Promise<boolean> {
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

    async async_store_or_update_object(object: ObjectWithUUID, force_rev_check: boolean = false, ignore_not_found: boolean = false): Promise<ObjectWithUUID> {
        // Get the latest rev
        if (object == null || isUndefined(object)) {
            throw new Error("Trying to save nothing / undefined?");
        }

        this.tracker.disableTrackingFor(object);
        this.save_notifications.next(SavingState.StartedSaving);
        try {
            let object_state = object.is_new ? "new" : "existing";
            if (object.is_new == false || force_rev_check) {
                try {
                    let existing = await this.db.get(object._id);
                    if (existing._rev != object._rev) {
                        // better update it!
                        this.logger.warn(`Updating rev on ${object} because the server is different (this could overwrite new changes)`);
                        object._rev = existing._rev;
                    }
                } catch (err) {
                    if (!ignore_not_found) {
                        this.logger.error(`Cannot update ${object_state} doc (cannot be read from the db, was it deleted?), ${err}`);
                        return;
                    }
                }
            }

            let dict_of_object = await this._converter.async_create_dict_from_js_object(object);
            dict_of_object = this._convert_add_type_id_and_rev(dict_of_object, object, true);
            this.logger.debug(`About to 'put' dict '${dict_of_object}' from type ${object.type}`);
            try {
                let response = await this.db.put(dict_of_object);

                this.logger.debug(`Stored ${object_state} object ${object.type} with new ID: ${object._id}`);
                if (object._id != response.id) {
                    object._id = response.id;
                }
                if (object._rev != response.rev) {
                    object._rev = response.rev;
                }
                if (object.is_new) {
                    object.is_new = false;
                }
                this.trackChanges(object);
                return object;
            } catch (err) {
                this.logger.debug(`Failed to store entity. Err: ${err}. Data: ${SafeJSON.stringify(dict_of_object)}`);
                throw Error(`Exception while storing ${object_state} type ${object.type}. ${err}. id: ${object.uuid}.`);
            }
        } finally {
            this.tracker.enableTrackingFor(object);
            this.save_notifications.next(SavingState.FinishedSaving);
        }
    }

    async async_load_and_create_objects_for_query(query) {
        let all_objects_of_type = await this.db.find(query);
        this.persistence_debug(`Hydrating ${all_objects_of_type.docs.length} objects, for query: ${query}`, 0);
        let list_of_new_things = [];
        for (let doc of all_objects_of_type.docs) {
            let type = doc['type'];
            let new_object = await this._converter.async_create_js_object_from_dict(doc, type);
            if (new_object) {
                list_of_new_things.push(new_object);
            } else {
                throw new Error(`Eh? Tried to load a doc ${doc._id}, but got nothing back... Result: '${SafeJSON.stringify(new_object)}'`);
            }
        }
        return list_of_new_things;
    }

    async async_load_all_objects_of_type(type: string) {
        let query = {selector: {type: type}};
        return await this.async_load_and_create_objects_for_query(query);
    }

    async async_load_into_store<T extends NamedObject>(manager: GenericManager<T>, type: string) {
        let loaded_objects = await this.async_load_all_objects_of_type(type);
        loaded_objects.forEach(o => {
            let ooo = o as T;
            if (ooo) {
                manager.add(ooo);
                this.trackChanges(ooo);
            } else {
                this.logger.warn(`Skipped ${o} because its not of the expected type: ${type}`);
            }
        });

        return loaded_objects;
    }

    async async_delete_object(object: ObjectWithUUID) {
        if (object.is_new) {
            throw new Error("Cannot remove object that is 'new' and hasn't been saved yet");
        }
        if (this.cache) {
            this.cache.evict(object);
        }
        this.tracker.untrack(object);
        return await this.db.remove({_id: object.uuid, _rev: object._rev});
    }

    trackChanges(object: any): ObjectWithUUID {
        if (object instanceof ObjectWithUUID) {
            this.storeInCache(object);
            this.tracker.track(object);
        }
        return object;
    }

    storeInCache(object: ObjectWithUUID) {
        if (this.cache && object) {
            this.cache.saveInCache(object);
        }
    }

    async trackerNotification(thing: ObjectChange) {
        // Don't worry about the changes per-say, since we're using debounce.
        // Just go ask the tracker what objects we should save
        for (let owner of Array.from(this.tracker.getChangedObjects().values())) {
            if (owner instanceof ObjectWithUUID) {
                let owuid = owner as ObjectWithUUID;
                await this.async_store_or_update_object(owuid).then(() => {
                    this.logger.info(`Save object: ${owuid.uuid}`);
                    this.tracker.clear_changes_for(owuid);
                });
            }
            // console.log(`XXXXXXXXX: ${SafeJSON.stringify(owner['uuid'])}`);
        }
    }

    async async_load_objects_with_query(query) {
        let docs = await this.db.find(query);

    }

    setCache(cache: IObjectCache) {
        this.cache = cache;
        this._converter.cache = cache;
    }
}


export {
    SchedulerDatabase,
    SavingState
}