import {
    IObjectStore,
    IReferenceResolver,
    MappingType,
    ObjectReference,
    PropertyMapping
} from "../mapping/orm-mapper-type";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {action, observable} from "mobx-angular";
import {IObjectCache} from "../mapping/cache";
import {OrmUtils} from "./orm-utils";
import {OrmConverterWriter} from "./orm-converter-writer";
import {runInAction} from "mobx";

class OrmConverter {
    private logger: Logger;

    private utils: OrmUtils;
    private _writer: OrmConverterWriter;

    constructor(private _mapper: OrmMapper,
                private _loader: IObjectStore,
                private _cache: IObjectCache = null,
                private _resolver: IReferenceResolver) {
        this.logger = LoggingWrapper.getLogger('db.converter');
        this.utils = new OrmUtils(this.logger);

        this._writer = new OrmConverterWriter(this._mapper, this._loader, this._cache);
    }

    get writer(): OrmConverterWriter {
        return this._writer;
    }

    get mapper(): OrmMapper {
        return this._mapper;
    }

    get cache(): IObjectCache {
        return this._cache;
    }

    set cache(value: IObjectCache) {
        this._cache = value;
        this._writer.setCache(value);
    }

    getObjectFromCache(uuid: string, new_object_type: string = null, nesting: number = 0): ObjectWithUUID {
        if (uuid) {
            let new_object = this.cache.getFromCache(uuid) as ObjectWithUUID;
            if (!new_object) {
                if (new_object_type) {
                    this.utils.debug(`No object in cache for ${new_object_type}/${uuid}...`, nesting);
                } else {
                    this.utils.debug(`No object in cache for ${uuid}...`, nesting);
                }
            } else {
                this.utils.debug(`Using existing object from cache for ${new_object.type}/${uuid}`, nesting);
            }
            return new_object;
        }
        return null;
    }

    @action
    async async_create_js_object_from_dict(dict: object, new_object_type: string, nesting: number = 0): Promise<ObjectWithUUID> {
        /*
        Assumption is that we begin with an object that has an ID and a type.
         */
        if (!new_object_type) {
            // Can we guess it?
            if (dict['type']) {
                if (this.mapper.propertiesFor(dict['type']) != null) {
                    new_object_type = dict['type'];
                    this.utils.debug(`new_object_type not specified, Ive guessed that it is: ${new_object_type}`, nesting);
                }
            }
            if (!new_object_type) {
                throw new Error('new_object_type not specified. This is required so we know what to instantiate');
            }
        }

        /*
        If it's an object of type ObjectWithUUID, we should prob look it up in cache.
        We allow this to fail, mainly because I'm not yet sure if I want it to be super strict and throw
         */
        let new_object = null;
        if (this.cache) {
            if (this.mapper.doesTypeInheritFrom(new_object_type, 'ObjectWithUUID')) {
                // In which case we expect the dict to have a uuid
                let uuid = dict['_id'];
                if (uuid) {
                    new_object = this.getObjectFromCache(uuid, new_object_type, nesting);
                } else {
                    this.utils.debug(`Didn't check cache for ${JSON.stringify(dict)}, it doesn't have an _id`, nesting);
                }
            } else {
                this.utils.debug(`Didn't check cache for type: ${new_object_type}, it doesnt inherit from ObjectWithUUID`, nesting);
            }
        } else {
            this.utils.debug(`Not using cache for ${new_object_type}. No cache configured.`, nesting);
        }
        return await this.async_create_js_object_from_dict_using(dict, new_object, new_object_type, nesting);
    }

    @action
    async async_create_js_object_from_dict_using(dict: object, new_object: ObjectWithUUID, new_object_type: string, nesting: number = 0): Promise<ObjectWithUUID> {
        if (!new_object) {
            this.utils.debug(`Creating new object of type: ${new_object_type}`, nesting);
            new_object = this.mapper.createNewInstanceOfType(new_object_type);
        }

        if (new_object == null) {
            throw new Error(`Failed to instantiate new object of type ${new_object_type}. Is the mapper configured with the right factories?`);
        }

        const targetProperties = this.mapper.propertiesFor(new_object.constructor.name);
        if (targetProperties.size == 0) {
            throw new Error(`Cannot hydrate ${dict['type']} because we don't know what it's mapped properties are`)
        }

        if (new_object instanceof ObjectWithUUID) {
            let fields = new_object.update_from_server(dict);
            if (fields.length) {
                this.utils.debug(`Set ${fields.join("/")} from doc`, nesting);
            }
        }

        // Now we need to go through the properties, and hydrate each and assign
        for (let propertyName of Array.from(targetProperties.keys())) {
            let mapping: PropertyMapping = targetProperties.get(propertyName);
            let value = dict[propertyName];

            if (propertyName == 'type') {
                // No reason why this shouldn't be the case, but you know, paranoia
                if (new_object.type != dict['type']) {
                    throw new Error(`Unable to hydrate ${dict} into object. Type ${new_object.type} != ${dict['type']}`);
                }
            } else {
                if (value == null) {
                    this.utils.debug(`Skipping ${propertyName}, its null`, nesting);
                    continue;
                }


                let newValueForProperty = null;

                switch (mapping.type) {
                    case MappingType.Property: {
                        newValueForProperty = this.mapper.convert_from_db_value_to_js_type(dict[propertyName], mapping);
                        this.utils.debug(`${propertyName} = ${newValueForProperty}`, nesting);
                        break;
                    }

                    /*
                    Expect the value to be a blob representing the new object.  Create it, then set it as the property
                     */
                    case MappingType.NestedObject: {
                        let new_type = value['type'];
                        this.utils.debug(`${propertyName} = new instance of ${new_type}`, nesting);
                        let new_object = await this.async_create_js_object_from_dict(value, new_type, nesting + 1);
                        newValueForProperty = this.removeIdAndRevIfNotNeededForThis(new_object, mapping);
                        break;
                    }

                    case MappingType.NestedObjectList: {
                        let new_objects = observable([]);
                        this.utils.debug(`${propertyName} = list of ${value.length} objects ...`, nesting);
                        this.utils.debug(`  - ${JSON.stringify(value)}`, nesting);
                        for (let v of value) {
                            let new_type = v['type'];

                            let the_item = await this.async_create_js_object_from_dict(v, new_type, nesting + 2);
                            if (the_item == null) {
                                throw new Error(`Odd. Converting an instance of ${v} to object, but got 'nothing' back`);
                            }

                            // If the item wasn't found, it'll be being added. So, push it on.
                            let item = this.removeIdAndRevIfNotNeededForThis(the_item, mapping);
                            new_objects.push(item);
                        }
                        newValueForProperty = new_objects;
                        // let usingExistingArray = new_object[propertyName] != null && new_object[propertyName] != 'undefined';
                        // let new_objects = new_object[propertyName] || observable([]);
                        // this.utils.debug(`${propertyName} = list of ${value.length} objects ...`, nesting);
                        // this.utils.debug(`  - ${JSON.stringify(value)}`, nesting);
                        // for (let v of value) {
                        //     let new_type = v['type'];
                        //
                        //     // can we already find this in the array?
                        //     let existing_item = new_objects.findIndex(o => o.uuid = v['_id']);
                        //     let the_item = await this.async_create_js_object_from_dict_using(v, existing_item, new_type, nesting + 2);
                        //     if (the_item == null) {
                        //         throw new Error(`Odd. Converting an instance of ${v} to object, but got 'nothing' back`);
                        //     }
                        //
                        //     // If the item wasn't found, it'll be being added. So, push it on.
                        //     let item = this.removeIdAndRevIfNotNeededForThis(the_item, mapping);
                        //     if (existing_item == null) {
                        //         new_objects.push(item);
                        //     }
                        // }
                        // if (usingExistingArray) {
                        //     newValueForProperty = new_objects;
                        // }
                        break;
                    }

                    case MappingType.Reference: {
                        this.utils.debug(`${propertyName} = reference: ${value}`, nesting);
                        let ref: ObjectReference = this.mapper.parse_reference(value);
                        newValueForProperty = await this._resolver.async_lookup_object_reference(ref, nesting + 1);
                        break;
                    }

                    case MappingType.ReferenceList: {
                        // Assume 'value' is a list of object references
                        this.utils.debug(`${propertyName} = list of ${value.length} references`, nesting);
                        newValueForProperty = await this._resolver.async_lookup_list_of_references(value, nesting + 1);
                        this.utils.debug(`    ... got ${newValueForProperty}`, nesting);
                        break;
                    }

                    case MappingType.MapWithReferenceValues: {
                        this.utils.debug(`${propertyName} = map of ${value.size} reference (values)`, nesting);
                        newValueForProperty = await this._resolver.async_lookup_map_of_reference_values(mapping, value, nesting + 1);
                        this.utils.debug(`    ... got ${newValueForProperty}`, nesting);
                        break;
                    }

                    case MappingType.MapWithReferenceKeys: {
                        this.utils.debug(`${propertyName} = map of ${value.size} reference (keys)`, nesting);
                        newValueForProperty = await this._resolver.async_lookup_map_of_reference_keys(mapping, value, nesting + 1);
                        this.utils.debug(`    ... got ${newValueForProperty}`, nesting);
                        break;
                    }

                    default: {
                        throw new Error(`Fail. Dunno how to handle: ${mapping.name} of type ${mapping.type}`);
                    }
                }
                runInAction(() => {
                    new_object[propertyName] = newValueForProperty;
                })
            }
        }

        if (new_object instanceof ObjectWithUUID) {
            new_object.setIsNew(false);
        }
        return new_object;
    }

    private removeIdAndRevIfNotNeededForThis(instance: any, mapping: PropertyMapping): any {
        if (!mapping || (mapping.type == MappingType.NestedObjectList || mapping.type == MappingType.NestedObject)) {
            // this is a fully encapsulated object. Remove any _id and _rev
            instance._id = undefined;
            instance._rev = undefined;
        }
        return instance;
    }

}

export {
    OrmConverter
}