import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger} from "ionic-logging-service";
import {ObjectWithUUID, TypedObject} from "../../scheduling/common/base_model";
import 'reflect-metadata';
import {SafeJSON} from "../../common/json/safe-stringify";
import {PersistenceProperty, PersistenceType} from "./db-types";
import {
    CreateNewObjectOfType,
    GetTheTypeNameOfTheObject,
    NameForPersistenceProp,
    NameForPersistencePropType,
    REF_PREFIX,
} from "./db-decorators";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {ConfigurationService} from "ionic-configuration-service";
import {isUndefined} from "util";
import {ObjectChange, ObjectChangeTracker} from "./db-change-detection";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Rx";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {debounceTime} from "rxjs/operators";
import {GenericManager, NamedObject} from "../../scheduling/common/scheduler-store";
import {Mapper} from "../mapping/mapper";
import Database = PouchDB.Database;

enum SavingState {
    Idle = 0,  // No changes
    ChangeDetected = 1, // changes were begun
    StartedSaving = 2, // changes were begun
    FinishedSaving = 3, // changes completed ok!
}

@Injectable()
class SchedulerDatabase {
    save_notifications = new Subject<SavingState>();
    ready_event: Subject<boolean>;

    private db: Database<{}>;
    private is_ready: boolean = false;
    logger: Logger;
    private current_indexes: PouchDB.Find.GetIndexesResponse<{}>;
    private db_name: string;
    private tracker: ObjectChangeTracker;
    private mapper: Mapper;

    static ConstructAndWait(configService: ConfigurationService, mapper: Mapper): Promise<SchedulerDatabase> {
        return new Promise<SchedulerDatabase>((resolve) => {
            let instance = new SchedulerDatabase(configService, mapper);
            instance.logger.info("Starting DB setup for TEST");
            instance.ready_event.subscribe(() => {
                resolve(instance);
            })
        });
    }

    constructor(configService: ConfigurationService, mapper: Mapper) {
        let db_config = configService.getValue("database");
        this.mapper = mapper;
        this.db_name = db_config['name'];
        this.logger = LoggingWrapper.getLogger("db");
        PouchDB.plugin(PouchDBFind);

        this.logger.info(`Setting up database: ${this.db_name} ...`);

        this.ready_event = new ReplaySubject();
        this.tracker = new ObjectChangeTracker(this.mapper);

        this.initialize();

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

    get is_saving(): boolean {
        return false;
    }

    async initialize() {
        this.db = await new PouchDB(this.db_name);

        this.logger.info("Getting DB information");
        let info = await this.db.info();
        this.logger.info(`DB: ${info.db_name} using backend: ${info.backend_adapter}. ${info.doc_count} docs.`);
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

    async load_object_with_id(id: string, nesting: number = 0): Promise<TypedObject> {
        if (isUndefined(id)) {
            throw new Error("load_object_with_id failed. You must pass in an id (you passed in 'undefined')");
        }
        let doc = await this.db.get(id);
        this.logger.debug(`Doc for loaded object: ${SafeJSON.stringify(doc)}`);
        if (doc['type']) {
            let object_type = doc['type'];
            this.persistence_debug(`load object ${id}, type: ${object_type}`, nesting);
            let instance = CreateNewObjectOfType(object_type);
            this.convert_from_json_to_object(doc, instance, nesting + 1);
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

    create_json_from_object(object: TypedObject, nesting: number = 0) {
        this.persistence_debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        let result = this._convert_object_value_to_dict({
            type: PersistenceType.NestedObject,
            name: 'root'
        }, object, nesting);
        return this._convert_add_type_id_and_rev(result, object, true, nesting);
    }

    private _convert_by_iterating_persistable_properties(origin: object, nesting: number = 0): object {
        let className = origin.constructor.name;
        const props = this.mapper.propertiesFor(origin.constructor.name);
        const result = {};
        if (props) {
            this.persistence_debug(`Iterating ${props.size} properties of ${className}`, nesting);
            props.forEach((type, propertyName) => {
                let value = origin[propertyName];
                let prop = {name: propertyName, type: type};
                this.persistence_debug(`${NameForPersistencePropType(type)} - ${propertyName} (value: ${value})`, nesting);
                result[propertyName] = this._convert_object_value_to_dict(prop, value, nesting + 1);
            });
        } else {
            this.persistence_debug(`Object has no properties`, nesting);
        }
        return this._convert_add_type_id_and_rev(result, origin, false, nesting);
    }

    private _convert_object_value_to_dict(prop, value, nesting: number = 0) {
        switch (prop.type) {
            case PersistenceType.Reference:
                return this._convert_to_reference(prop, value, nesting + 1);
            case PersistenceType.ReferenceList:
                return this._convert_to_reference_list(prop, value, nesting + 1);
            case PersistenceType.Property:
                return value;
            case PersistenceType.NestedObject:
                return this._convert_to_nested_object_dict(prop, value, nesting + 1);
            case PersistenceType.NestedObjectList:
                return this._convert_to_nested_object_list_of_dict(prop, value, nesting + 1);
        }
    }

    async store_or_update_object(object: ObjectWithUUID, force_rev_check: boolean = false, ignore_not_found: boolean = false): Promise<ObjectWithUUID> {
        // Get the latest rev
        if (object == null || isUndefined(object)) {
            throw new Error("Trying to save nothing / undefined?");
        }

        this.tracker.disable_tracking_for(object);
        this.save_notifications.next(SavingState.StartedSaving);
        try {
            let object_state = object.is_new ? "new" : "existing";
            if (object.is_new == false || force_rev_check) {
                try {
                    let existing = await this.db.get(object._id);
                    if (existing._rev != object._rev) {
                        // better update it!
                        this.logger.info(`Updating rev on ${object} because the server is different`);
                        object._rev = existing._rev;
                    }
                } catch (err) {
                    if (!ignore_not_found) {
                        this.logger.error(`Cannot update ${object_state} doc (cannot be read from the db, was it deleted?), ${err}`);
                        return;
                    }
                }
            }

            let dict_of_object = this.create_json_from_object(object);
            try {
                let response = await this.db.put(dict_of_object);

                this.logger.info(`Stored ${object_state} object ${object.type} with new ID: ${object._id}`);
                if (object._id != response.id) {
                    object._id = response.id;
                }
                if (object._rev != response.rev) {
                    object._rev = response.rev;
                }
                if (object.is_new) {
                    object.is_new = false;
                }
                return object;
            } catch (err) {
                this.logger.debug(`Failed to store entity. Err: ${err}. Data: ${SafeJSON.stringify(dict_of_object)}`);
                throw Error(`Exception while storing ${object_state} type ${object.type}. ${err}. id: ${object.uuid}.`);
            }
        } finally {
            this.tracker.enable_tracking_for(object);
            this.save_notifications.next(SavingState.FinishedSaving);
        }
    }

    private convert_from_json_to_object(json_obj: PouchDB.Core.Document<{}>, new_object: TypedObject, nesting: number = 0) {
        /*
        Assumption is that we begin with an object that has an ID and a type.
         */
        const target_props = this.mapper.propertiesFor(new_object.constructor.name);
        if (target_props.size == 0) {
            throw new Error(`Cannot hydrate ${json_obj['type']} because we don't know what it's persistable properties are`)
        }

        if (new_object instanceof ObjectWithUUID) {
            let fields = new_object.update_from_server(json_obj);
            if (fields.length) {
                this.persistence_debug(`Set ${fields.join("/")} from doc`, nesting);
            }
        }

        // Now we need to go through the properties, and hydrate each and assign
        target_props.forEach((type, propertyName) => {
            let value = json_obj[propertyName];

            if (propertyName == 'type') {
                // No reason why this shouldn't be the case, but you know, paranoia
                if (new_object.type != json_obj['type']) {
                    throw new Error(`Unable to hydrate ${json_obj} into object. Type ${new_object.type} != ${json_obj['type']}`);
                }
            } else {
                if (value == null) {
                    this.persistence_debug(`Skipping ${propertyName}, its null`, nesting);
                    return;
                }

                switch (type) {
                    case PersistenceType.Property: {
                        this.persistence_debug(`${propertyName} = ${value}`, nesting);
                        new_object[propertyName] = json_obj[propertyName];
                        break;
                    }

                    /*
                    Expect the value to be a blob representing the new object.  Create it, then set it as the property
                     */
                    case PersistenceType.NestedObject: {
                        let new_type = value['type'];
                        this.persistence_debug(`${propertyName} = new instance of ${new_type}`, nesting);
                        let new_instance = CreateNewObjectOfType(new_type);
                        new_object[propertyName] = this.convert_from_json_to_object(value, new_instance, nesting + 1);
                        break;
                    }

                    case PersistenceType.NestedObjectList: {
                        let new_objects = [];
                        this.persistence_debug(`${propertyName} = list of ${value.length} objects ...`, nesting);
                        value.forEach(v => {
                            let new_type = v['type'];
                            this.persistence_debug(`creating new instance of ${new_type}`, nesting + 1);
                            let new_instance = CreateNewObjectOfType(new_type);
                            new_objects.push(this.convert_from_json_to_object(v, new_instance, nesting + 2));
                        });
                        new_object[propertyName] = new_objects;
                        break;
                    }

                    case PersistenceType.Reference: {
                        this.persistence_debug(`${propertyName} = reference: ${value}`, nesting);
                        new_object[propertyName] = this.lookup_object_reference(value, nesting + 1);
                        break;
                    }

                    case PersistenceType.ReferenceList: {
                        // Assume 'value' is a list of object references
                        this.persistence_debug(`${propertyName} = list of ${value.length} references`, nesting);
                        new_object[propertyName] = value.map(ref => this.lookup_object_reference(ref, nesting + 1));
                        break;
                    }

                    default: {
                        throw new Error(`Fail. Dunno how to handle PersistenceType: ${type}`);
                    }
                }
            }
        });

        return new_object;
    }

    private async _load_all_of_type(type: string) {
        let new_object = CreateNewObjectOfType(type);
        let type_name = new_object.constructor.name;
        let all_objects_of_type = await this.db.find({selector: {type: type_name}});
        this.persistence_debug(`Loading all ${all_objects_of_type.docs.length} objects of type ${type} into object store...`, 0);
        return all_objects_of_type.docs.map(doc => {
            new_object = CreateNewObjectOfType(type);
            let new_type = new_object.constructor.name;
            this.persistence_debug(`Creating new object of type ${type} (check ${type} == ${new_type} ... ${type == new_type ? "Yay!" : "Oh. Darn."})...`, 0);
            return this.convert_from_json_to_object(doc, new_object, 1);
        })
    }

    async load_into_store<T extends NamedObject>(manager: GenericManager<T>, type: string) {
        let loaded_objects = await this._load_all_of_type(type);
        loaded_objects.forEach(o => {
            let ooo = o as T;
            if (ooo) {
                manager.add(ooo);
                this.trackChanges(ooo);
            } else {
                this.logger.warn(`Skipped ${o} because its not of the expected type: ${type}`);
            }
        });

        // Also track changes to the store itself
        // TODO: Remove this, should be tracking changes to the RootStore.items I think.
        // this.trackChanges(object_store);
    }

    private lookup_object_reference(reference: string, nesting: number = 0) {
        let parts = reference.split(':');
        if (parts.length != 3) {
            throw new Error(`Invalid reference ${reference}. Expected 3 parts`);
        }
        if (parts[0] != REF_PREFIX) {
            throw new Error(`Invalid reference ${reference}. Expected part[0] to be 'ref'`);
        }
        let object_id = parts[2];
        return this.load_object_with_id(object_id, nesting);
    }

    reference_for_object(obj: ObjectWithUUID) {
        return `${REF_PREFIX}:${obj.type}:${obj._id}`;
    }

    private _convert_to_reference(prop: PersistenceProperty, value: any, nesting: number = 0) {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameForPersistenceProp(prop)}, it is an array`)
        }
        if (!(value instanceof ObjectWithUUID)) {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameForPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a ObjectWithUUID`);
        }
        this.persistence_debug(`Convert ${value} to reference`, nesting);
        return this.reference_for_object(value);
    }

    private _convert_to_nested_object_dict(prop: PersistenceProperty, value: any, nesting: number = 0) {
        if (!(value instanceof TypedObject)) {
            throw new Error(`NESTED OBJ: Cannot convert ${prop.name} to ${NameForPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a PersistableObject`);
        }
        this.persistence_debug(`Converting ${value.constructor.name} by iterating its properties...`, nesting);
        return this._convert_add_type_id_and_rev(this._convert_by_iterating_persistable_properties(value, nesting + 1), value, false, nesting);
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

    private _convert_to_nested_object_list_of_dict(prop: any, value: any, nesting: number = 0) {
        /*
        Fix: return [] if undefined or null. But why happen?
         */
        this.persistence_debug(`_convert_to_nested_object_list_of_dict: Nested object list: ${SafeJSON.stringify(value)}`, nesting);
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => v.constructor.name))).join(",");
            this.persistence_debug(`convert nested list of ${value.length} items, types: ${type_names}`, nesting);
            return value.map((v, index) => {
                this.persistence_debug(`${prop.name}[${index}]`, nesting + 1);
                return this._convert_by_iterating_persistable_properties(v, nesting + 2);
            });
        } else {
            throw new Error(`NESTEDLIST: Cannot convert ${prop.name} to ${NameForPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }

    private _convert_to_reference_list(prop: any, value: any, nesting: number = 0) {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => {
                return v.constructor.name;
            }))).join(",");

            this.persistence_debug(`convert list of ${value.length} items, types: ${type_names}`, nesting);
            return value.map((v, index) => {
                this.persistence_debug(`converting ${prop.name}[${index}], ${v.constructor.name}`, nesting);
                let indexes_prop = {type: PersistenceType.Reference, name: `${prop.name}[${index}}`};
                return this._convert_to_reference(indexes_prop, v, nesting + 1);
            });
        } else {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameForPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }

    async delete_object(object: ObjectWithUUID) {
        if (object.is_new) {
            throw new Error("Cannot remove object that is 'new' and hasn't been saved yet");
        }
        this.tracker.untrack(object);
        return this.db.remove({_id: object.uuid, _rev: object._rev});
    }

    trackChanges(object: any): ObjectWithUUID {
        if (object instanceof ObjectWithUUID) {
            this.tracker.track(object);
        }
        return object;
    }

    trackerNotification(thing: ObjectChange) {
        // Don't worry about the changes per-say, since we're using debounce.
        // Just go ask the tracker what objects we should save
        this.tracker.getChangedObjects().forEach((owner) => {
            if (owner instanceof ObjectWithUUID) {
                this.store_or_update_object(owner).then(() => {
                    this.logger.info(`Save object: ${owner.uuid}`);
                    this.tracker.clear_changes_for(owner);
                });
            }
            // console.log(`XXXXXXXXX: ${SafeJSON.stringify(owner['uuid'])}`);
        });
    }
}


export {
    SchedulerDatabase,
    SavingState
}