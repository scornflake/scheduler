import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {Logger, LoggingService, LogLevel} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";
import 'reflect-metadata';
import {SafeJSON} from "../../common/json/safe-stringify";
import {isObservableArray} from "mobx";
import Database = PouchDB.Database;
import {SavedState} from "../../store/UIState";

const propsMetadataKey = Symbol('persisted');
const classesMetadataKey = Symbol('classes');

function persisted() {
    return registerPersisted;
}

class Creator {
    static makeNew(type: string) {
        switch (type) {
            case 'SavedState': {
                return new SavedState()
            }
            default:
                throw Error(`No type ${type} registered. Cannot create the object`);
        }
    }
}

function registerPersisted(target: object, propertyKey: string) {
    let class_name = target.constructor.name;
    if (target.hasOwnProperty('constructor')) {
        console.log(`Register persisted property: ${class_name}, prop: ${propertyKey}`);

    }
    let properties: string[] = Reflect.getMetadata(propsMetadataKey, target);
    if (properties) {
        properties.push(propertyKey);
    } else {
        properties = [propertyKey];
        Reflect.defineMetadata(propsMetadataKey, properties, target);
    }

    let class_names: string[] = Reflect.getMetadata(classesMetadataKey, SchedulerDatabase);
    if (class_names) {
        if (class_names.indexOf(class_name) == -1) {
            class_names.push(class_name);
            console.log(`Register persisted class: ${class_name}`);
        }
    } else {
        class_names = [class_name];
        console.log(`Register persisted class: ${class_name}`);
        Reflect.defineMetadata(classesMetadataKey, class_names, SchedulerDatabase);
    }
}

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

    create_json_blob_from(object: PersistableObject) {
        let json_object = this.persisted_properties(object);
        json_object['type'] = object.type;
        if (object instanceof ObjectWithUUID) {
            json_object['_id'] = object._id;
            json_object['_rev'] = object._rev;
        }
        return json_object;
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

        let json_object = this.create_json_blob_from(object);

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

    persisted_properties(origin: object): object {
        return this.registered_stuff(origin, propsMetadataKey);
    }

    private registered_stuff(origin: object, metadataKey) {
        const properties: string[] = Reflect.getMetadata(metadataKey, origin);
        const result = {};
        if (properties) {
            properties.forEach(key => {
                    result[key] = this.convert_to_json(origin[key], metadataKey);
                }
            );
        }
        return result;
    }

    private convert_to_json(value: object, metadataKey) {
        if (value instanceof ObjectWithUUID) {
            // MUST be serialized as a reference
            return this.reference_for_object(value);
        } else if (value instanceof PersistableObject) {
            return this.registered_stuff(value, metadataKey);
        } else if (isObservableArray(value)) {
            // Recurse
            return value.map(v => {
                return this.convert_to_json(v, metadataKey)
            });
        } else if (Array.isArray(value)) {
            // Recurse
            value.map(v => this.convert_to_json(v, metadataKey));
        } else {
            return value;
        }
    }

    private reference_for_object(obj: ObjectWithUUID) {
        return `ref:${obj.type}:${obj._id}`;
    }
}


export {
    SchedulerDatabase,
    persisted,
}