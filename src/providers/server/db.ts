import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger, LogLevel} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {BaseStore, ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";
import 'reflect-metadata';
import {SafeJSON} from "../../common/json/safe-stringify";
import {isObservableArray} from "mobx";
import {PersistenceType} from "./db-types";
import {NameOfPersistenceProp, PersistenceProperty, propsMetadataKey, REF_PREFIX} from "./db-decorators";
import {Creator} from "./db-creator";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {ConfigurationService} from "ionic-configuration-service";
import Database = PouchDB.Database;


@Injectable()
class SchedulerDatabase {
    ready_event: Observable<boolean>;

    private db: Database<{}>;
    private logger: Logger;
    private current_indexes: PouchDB.Find.GetIndexesResponse<{}>;
    private db_name: string;

    constructor(configService: ConfigurationService) {
        let db_config = configService.getValue("database");
        this.db_name = db_config['name'];
        this.logger = LoggingWrapper.getLogger("store.db");
        PouchDB.plugin(PouchDBFind);

        this.logger.info(`Setting up database '${this.db_name}'...`);

        this.ready_event = Observable.create(obs => {
            this.initialize().then(done => {
                obs.next(true);
            });
        }).pipe(share());

        this.ready_event.subscribe(val => {
            this.logger.info("DB is ready");
        })
    }

    async initialize(destroy_first: boolean = false) {
        this.db = await new PouchDB(this.db_name);

        if (destroy_first) {
            console.log("Destroying DB...");
            await this.delete_all();
        }

        this.logger.info("Getting DB information");
        let info = await this.db.info();
        this.logger.info(`DB: ${info.db_name} using backend: ${info.backend_adapter}. ${info.doc_count} docs.`);
        await this.setup_indexes();
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
        await this.db.destroy();
        this.db = await new PouchDB("scheduler");
    }

    private index_exists(name: string): boolean {
        return this.current_indexes.indexes.find(idx => idx.name == name) != null;
    }

    async load_object_with_id(id: string): Promise<any> {
        let data = await this.db.get(id);
        if (data['type']) {
            let object_type = data['type'];
            let instance = Creator.makeNew(object_type);
            if (instance instanceof ObjectWithUUID) {
                instance.is_new = false;
            }
            return Object.assign(instance, data);
        }
        return data;
    }

    gap(width: number): string {
        return " ".repeat(width);
    }

    persistence_debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

    create_json_from_object(object: PersistableObject, nesting: number = 0) {
        this.persistence_debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        let result = this._convert_object_value_to_dict({
            type: PersistenceType.NestedObject,
            name: 'root'
        }, object, nesting);
        return this._convert_add_type_id_and_rev(result, object, true);
    }

    private _convert_by_iterating_persistable_properties(origin: object, nesting: number = 0): object {
        const properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, origin);
        const result = {};
        if (properties) {
            this.persistence_debug(`Iterating ${properties.length} properties of ${origin.constructor.name}`, nesting);
            properties.forEach(prop => {
                    let value = origin[prop.name];
                    result[prop.name] = this._convert_object_value_to_dict(prop, value, nesting);
                    this.persistence_debug(`${NameOfPersistenceProp(prop)} - ${prop.name}`, nesting);
                }
            );
        } else {
            this.persistence_debug(`Object has no properties`, nesting);
        }
        return this._convert_add_type_id_and_rev(result, origin);
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

    async store_or_update_object(object: ObjectWithUUID, force_rev_check: boolean = false, ignore_not_found: boolean = false) {
        // Get the latest rev
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

        let json_object = this.create_json_from_object(object);

        try {
            let new_object = await this.db.put(json_object);
            if (new_object.ok) {
                if (this.logger.getLogLevel() == LogLevel.INFO) {
                    this.logger.info(`Stored ${object_state} object ${object.type} with new ID: ${object._id}`);
                }
                if (this.logger.getLogLevel() == LogLevel.TRACE) {
                    this.logger.info(`Stored ${object_state} object ${object.type} with ${SafeJSON.stringify(json_object)}`);
                }
                if (object._id != new_object.id) {
                    object._id = new_object.id;
                }
                if (object._rev != new_object.rev) {
                    object._rev = new_object.rev;
                }
                if (object.is_new) {
                    object.is_new = false;
                }
            } else {
                this.logger.error(`Failed to store ${object_state} object of type ${object.type}, id: ${object.uuid}.`);
            }
        } catch (err) {
            throw Error(`Exception while storing ${object_state} object of type ${object.type}, id: ${object.uuid}. ${err}`);
        }
    }

    private convert_from_json_to_object(json_obj: PouchDB.Core.Document<{}>, new_object: PersistableObject) {
        /*
        Assumption is that we begin with an object that has an ID and a type.
         */
        const target_properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, new_object);
        if (target_properties.length == 0) {
            throw new Error(`Cannot hydrate ${json_obj['type']} because we don't know what it's persistable properties are`)
        }

        // Now we need to go through the properties, and see
        target_properties.forEach(prop => {
            let value = json_obj[prop.name];
            if (prop.name == 'id') {
                new_object['_id'] = value;
            } else if (prop.name == 'rev') {
                new_object['_rev'] = value;
            } else if (prop.name == 'type') {
                if (new_object.type != json_obj['type']) {
                    throw new Error(`Unable to hydrate ${json_obj} into object. Type ${new_object.type} != ${json_obj['type']}`);
                }
            } else {
                // OK. Now we don't know what this is.
                // If it's a 'ref:type:id', we know to find the object and set it
                if (value == null) {
                    return;
                }

                switch (prop.type) {
                    case PersistenceType.Property: {
                        new_object[prop.name] = json_obj[prop.name];
                        break;
                    }

                    /*
                    Expect the value to be a blob representing the new object.  Create it, then set it as the property
                     */
                    case PersistenceType.NestedObject: {
                        let new_type = value['type'];
                        let new_instance = Creator.makeNew(new_type);
                        new_object[prop.name] = this.convert_from_json_to_object(value, new_instance);
                        break;
                    }

                    case PersistenceType.NestedObjectList: {
                        let new_objects = [];
                        value.forEach(v => {
                            let new_type = v['type'];
                            let new_instance = Creator.makeNew(new_type);
                            new_objects.push(this.convert_from_json_to_object(v, new_instance));
                        });
                        new_object[prop.name] = new_objects;
                        break;
                    }

                    case PersistenceType.Reference: {
                        new_object[prop.name] = this.lookup_object_reference(value);
                        break;
                    }

                    case PersistenceType.ReferenceList: {
                        // Assume 'value' is a list of object references
                        new_object[prop.name] = value.map(ref => this.lookup_object_reference(ref));
                        break;
                    }
                }
            }
        });

        return new_object;
    }

    async load_all_of_type(type: string) {
        let new_object = Creator.makeNew(type);
        let type_name = new_object.constructor.name;
        let all_objects_of_type = await this.db.find({selector: {type: type_name}});
        this.logger.info(`Loading all ${all_objects_of_type.docs.length} objects of type ${type} into object store...`);
        return all_objects_of_type.docs.map(doc => {
            let new_object = Creator.makeNew(type);
            return this.convert_from_json_to_object(doc, new_object);
        })
    }

    async load_into_store<T extends ObjectWithUUID>(object_store: BaseStore<T>, type: string) {
        let loaded_objects = await this.load_all_of_type(type);
        loaded_objects.forEach(o => {
            let ooo = o as T;
            if (ooo) {
                object_store.add_object_to_array(ooo, true);
            } else {
                this.logger.warn(`Skipped ${o} because its not of the expected type: ${type}`);
            }
        });
    }

    private lookup_object_reference(reference: string) {
        let parts = reference.split(':');
        if (parts.length != 3) {
            throw new Error(`Invalid reference ${reference}. Expected 3 parts`);
        }
        if (parts[0] != REF_PREFIX) {
            throw new Error(`Invalid reference ${reference}. Expected part[0] to be 'ref'`);
        }
        let object_id = parts[2];
        return this.load_object_with_id(object_id);
    }

    reference_for_object(obj: ObjectWithUUID) {
        return `${REF_PREFIX}:${obj.type}:${obj._id}`;
    }

    private _convert_to_reference(prop: PersistenceProperty, value: any, nesting: number = 0) {
        if (Array.isArray(value)) {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an array`)
        }
        if (isObservableArray(value)) {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an mbox array`);
        }
        if (!(value instanceof ObjectWithUUID)) {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a ObjectWithUUID`);
        }
        this.persistence_debug(`Convert ${value} to reference`, nesting);
        return this.reference_for_object(value);
    }

    private _convert_to_nested_object_dict(prop: PersistenceProperty, value: any, nesting: number = 0) {
        if (!(value instanceof PersistableObject)) {
            throw new Error(`NESTED OBJ: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a PersistableObject`);
        }
        this.persistence_debug(`Converting ${value.constructor.name} by iterating its properties...`, nesting);
        return this._convert_by_iterating_persistable_properties(value, nesting + 1);
    }

    private _convert_add_type_id_and_rev(dict, value, include_id_and_rev: boolean = false) {
        let po = value as PersistableObject;
        if (po) {
            dict.type = po.type;
            let owuid = po as ObjectWithUUID;
            if (owuid && include_id_and_rev) {
                dict._id = owuid._id;
                dict._rev = owuid._rev;
            }
        }
        return dict;
    }

    private _convert_to_nested_object_list_of_dict(prop: any, value: any, nesting: number = 0) {
        if (isObservableArray(value) || Array.isArray(value)) {
            return value.map(v => {
                return this._convert_by_iterating_persistable_properties(v, nesting + 1);
            });
        } else {
            throw new Error(`NESTEDLIST: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }

    private _convert_to_reference_list(prop: any, value: any, nesting: number = 0) {
        if (isObservableArray(value) || Array.isArray(value)) {
            let type_names = Array.from(new Set(value.map(v => v.constructor.name))).join(",");
            this.persistence_debug(`convert list of ${value.length} items, types: ${type_names}`, nesting);
            return value.map((v, index) => {
                this.persistence_debug(`converting a ${v.constructor.name}`, nesting);
                let indexes_prop = {type: PersistenceType.Reference, name: `${prop.name}[${index}}`};
                return this._convert_to_reference(indexes_prop, v, nesting + 1);
            });
        } else {
            throw new Error(`REF: Cannot convert ${prop.name} to ${NameOfPersistenceProp(prop)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }
}


export {
    SchedulerDatabase,
}