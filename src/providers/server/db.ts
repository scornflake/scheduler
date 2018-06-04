import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger, LoggingService, LogLevel} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {BaseStore, ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";
import 'reflect-metadata';
import {SafeJSON} from "../../common/json/safe-stringify";
import {isObservableArray} from "mobx";
import {PersistenceType} from "./db-types";
import {PersistenceProperty, propsMetadataKey, REF_PREFIX} from "./db-decorators";
import Database = PouchDB.Database;
import {Creator} from "./db-creator";


@Injectable()
class SchedulerDatabase {
    ready_event: Observable<boolean>;

    private db: Database<{}>;
    private logger: Logger;
    private current_indexes: PouchDB.Find.GetIndexesResponse<{}>;

    constructor(public logService: LoggingService) {
        this.logger = logService.getLogger("store.db");
        PouchDB.plugin(PouchDBFind);

        this.logger.info("Setting up database...");

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
        this.db = await new PouchDB("scheduler");

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

    create_json_from_object(object: PersistableObject) {
        let json_object = this._persisted_properties(object);
        json_object['type'] = object.type;
        if (object instanceof ObjectWithUUID) {
            json_object['_id'] = object._id;
            json_object['_rev'] = object._rev;
        }
        return json_object;
    }

    private _persisted_properties(origin: object): object {
        const properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, origin);
        const result = {};
        if (properties) {
            properties.forEach(prop => {
                    let value = origin[prop.name];
                    result[prop.name] = this._convert_to_json(value, propsMetadataKey);
                }
            );
        }
        return result;
    }

    private _convert_to_json(value: object, metadataKey) {
        if (value instanceof ObjectWithUUID) {
            // MUST be serialized as a reference
            return this.reference_for_object(value);
        } else if (value instanceof PersistableObject) {
            let po = this._persisted_properties(value);
            po['type'] = value.type;
            return po;
        } else if (isObservableArray(value)) {
            // Recurse
            return value.map(v => {
                return this._convert_to_json(v, metadataKey)
            });
        } else if (Array.isArray(value)) {
            // Recurse
            value.map(v => this._convert_to_json(v, metadataKey));
        } else {
            return value;
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
        let uuid_objs = new Array<ObjectWithUUID>();
        loaded_objects.forEach(o => {
            let ooo = o as T;
            if(ooo) {
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

    private reference_for_object(obj: ObjectWithUUID) {
        return `${REF_PREFIX}:${obj.type}:${obj._id}`;
    }
}


export {
    SchedulerDatabase,
}