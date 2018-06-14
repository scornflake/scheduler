import {
    IObjectLoader,
    MappingType,
    NameForMappingPropType,
    PropertyHint,
    PropertyMapping,
    REF_PREFIX
} from "../mapping/orm-mapper-type";
import {ObjectWithUUID, TypedObject} from "../../scheduling/base-types";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";
import * as moment from "moment";
import {isUndefined} from "util";
import {observable} from "mobx-angular";
import {IObjectCache} from "../mapping/cache";

class OrmConverter {
    private mapper: OrmMapper;
    private logger: Logger;
    private objectLoader: IObjectLoader;
    private _cache: IObjectCache;

    constructor(mapper: OrmMapper, loader: IObjectLoader, cache: IObjectCache = null) {
        this.mapper = mapper;
        this.objectLoader = loader;
        this._cache = cache;
        this.logger = LoggingWrapper.getLogger('db.converter');
    }

    get cache(): IObjectCache {
        return this._cache;
    }

    set cache(value: IObjectCache) {
        this._cache = value;
    }

    async async_create_dict_from_js_object(object: TypedObject, nesting: number = 0) {
        this.debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        return await this._convert_object_value_to_dict({
            type: MappingType.NestedObject,
            name: 'root'
        }, object, nesting);
    }

    async async_create_js_object_from_dict(dict: object, new_object_type: string, nesting: number = 0): Promise<ObjectWithUUID> {
        /*
        Assumption is that we begin with an object that has an ID and a type.
         */
        if (!new_object_type) {
            // Can we guess it?
            if (dict['type']) {
                if (this.mapper.propertiesFor(dict['type']) != null) {
                    new_object_type = dict['type'];
                    this.debug(`new_object_type not specified, Ive guessed that it is: ${new_object_type}`, nesting);
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
        if (this._cache) {
            if (this.mapper.doesTypeInheritFrom(new_object_type, 'ObjectWithUUID')) {
                // In which case we expect the dict to have a uuid
                let uuid = dict['_id'];
                if (uuid) {
                    new_object = this._cache.getFromCache(uuid);
                    if (!new_object) {
                        this.debug(`No object in cache for ${new_object_type}/${uuid}...`, nesting);
                    } else {
                        this.debug(`Using existing object from cache for ${new_object_type}/${uuid}`, nesting);
                    }
                } else{
                    this.debug(`Didn't check cache for ${JSON.stringify(dict)}, it doesn't have an _id`, nesting);
                }
            } else {
                this.debug(`Didn't check cache for type: ${new_object_type}, it doesnt inherit from ObjectWithUUID`, nesting);
            }
        } else {
            this.debug(`Not using cache for ${new_object_type}. No cache configured.`, nesting);
        }

        if (!new_object) {
            this.debug(`Creating new object of type: ${new_object_type}`, nesting);
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
                this.debug(`Set ${fields.join("/")} from doc`, nesting);
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
                    this.debug(`Skipping ${propertyName}, its null`, nesting);
                    continue;
                }

                switch (mapping.type) {
                    case MappingType.Property: {
                        new_object[propertyName] = this.convert_from_db_value_to_js_type(dict[propertyName], mapping);
                        this.debug(`${propertyName} = ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    /*
                    Expect the value to be a blob representing the new object.  Create it, then set it as the property
                     */
                    case MappingType.NestedObject: {
                        let new_type = value['type'];
                        this.debug(`${propertyName} = new instance of ${new_type}`, nesting);
                        let new_object = await this.async_create_js_object_from_dict(value, new_type, nesting + 1);
                        new_object[propertyName] = this.removeIdAndRevIfNotNeededForThis(new_object, mapping);
                        break;
                    }

                    case MappingType.NestedObjectList: {
                        let new_objects = observable([]);
                        this.debug(`${propertyName} = list of ${value.length} objects ...`, nesting);
                        this.debug(`  - ${JSON.stringify(value)}`, nesting);
                        for (let v of value) {
                            let new_type = v['type'];
                            let the_item = await this.async_create_js_object_from_dict(v, new_type, nesting + 2);
                            if (the_item == null) {
                                throw new Error(`Odd. Converting an instance of ${v} to object, but got 'nothing' back`);
                            }
                            new_objects.push(this.removeIdAndRevIfNotNeededForThis(the_item, mapping));
                        }
                        new_object[propertyName] = new_objects;
                        break;
                    }

                    case MappingType.Reference: {
                        this.debug(`${propertyName} = reference: ${value}`, nesting);
                        new_object[propertyName] = await this._async_lookup_object_reference(value, nesting + 1);
                        break;
                    }

                    case MappingType.ReferenceList: {
                        // Assume 'value' is a list of object references
                        this.debug(`${propertyName} = list of ${value.length} references`, nesting);
                        new_object[propertyName] = await this._async_lookup_list_of_references(value, nesting + 1);
                        this.debug(`    ... got ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    case MappingType.MapWithReferenceValues: {
                        this.debug(`${propertyName} = map of ${value.size} reference (values)`, nesting);
                        new_object[propertyName] = await this._lookup_map_of_reference_values(mapping, value, nesting + 1);
                        this.debug(`    ... got ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    case MappingType.MapWithReferenceKeys: {
                        this.debug(`${propertyName} = map of ${value.size} reference (keys)`, nesting);
                        new_object[propertyName] = await this._lookup_map_of_reference_keys(mapping, value, nesting + 1);
                        this.debug(`    ... got ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    default: {
                        throw new Error(`Fail. Dunno how to handle: ${mapping.name} of type ${mapping.type}`);
                    }
                }
            }
        }
        new_object.is_new = false;
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

    private async _lookup_map_of_reference_keys(mapping: PropertyMapping, value: any, nesting: number) {
        // So. The keys will be references.
        // For now, the values are presumed to be primitives.
        let result_map = new Map<TypedObject, any>();
        let reference_keys = Object.keys(value);
        for (let key of reference_keys) {
            let reference = key.toString();
            this.debug(`_lookup_map_of_reference_keys going to try lookup on: ${reference}`, nesting);

            let reference_obj = await this._async_lookup_object_reference(reference);
            let js_value = this.convert_from_db_value_to_js_type(value[key], mapping);
            result_map.set(reference_obj, js_value);
        }
        return result_map;
    }

    private async _lookup_map_of_reference_values(mapping: PropertyMapping, value: any, nesting: number) {
        let result_map = new Map<any, any>();
        this.debug(`_lookup_map_of_reference_values received a value of ${SafeJSON.stringify(value)}`, nesting);

        let reference_keys = Object.keys(value);
        this.debug(`_lookup_map_of_reference_values keys ${SafeJSON.stringify(reference_keys)}`, nesting);
        for (let key of reference_keys) {
            let reference = value["" + key];
            let typeName = GetTheTypeNameOfTheObject(reference);
            let js_key = this.convert_from_db_value_to_js_type(key, mapping);
            if (typeName == 'array') {
                this.debug(`_lookup_map_of_reference_values looking array of references: ${reference}/${typeName}`, nesting);
                result_map.set(js_key, await this._async_lookup_list_of_references(reference, nesting + 1));
            } else {
                this.debug(`_lookup_map_of_reference_values going to try lookup on: ${reference}/${typeName}`, nesting);
                result_map.set(js_key, await this._async_lookup_object_reference(reference, nesting + 1));
            }
        }

        return result_map;
    }

    convert_from_js_value_to_db_value(thing: any, mapping: PropertyMapping) {
        if (mapping == null || isUndefined(mapping)) {
            throw new Error(`Trying to 'convert_from_js_value_to_db_value' but got ${mapping} for the mapping`);
        }
        if (thing == null || isUndefined(thing)) {
            return thing;
        }
        if (mapping.hint == PropertyHint.Date) {
            if (!(thing instanceof Date)) {
                throw new Error(`Could not convert ${thing} into a formatted date, for property: ${mapping.name}. It's not a Date object, rather it's a ${thing}`);
            }
            return thing.toISOString();
        }
        return thing;
    }

    convert_from_db_value_to_js_type(value: string, mapping: PropertyMapping) {
        if (mapping == null || isUndefined(mapping)) {
            throw new Error(`Trying to 'convert_from_db_value_to_js_type' for property ${value} but got ${mapping} for the mapping`);
        }
        if (mapping.hint == PropertyHint.Date) {
            let a_date = moment(value);
            if (!a_date.isValid()) {
                throw new Error(`Could not parse ${value} into a Date. For property: ${mapping.name}`);
            }
            return a_date.toDate();
        }
        return value;
    }

    private async _async_lookup_list_of_references(value, nesting: number = 0) {
        let new_list = observable([]);
        for (let item of value) {
            new_list.push(await this._async_lookup_object_reference(item, nesting + 1));
        }
        return new_list;
    }


    private async _async_lookup_object_reference(reference: string, nesting: number = 0) {
        let parts = reference.split(':');
        if (parts.length != 3) {
            throw new Error(`Invalid reference ${reference}. Expected 3 parts`);
        }
        if (parts[0] != REF_PREFIX) {
            throw new Error(`Invalid reference ${reference}. Expected part[0] to be 'ref'`);
        }
        let object_id = parts[2];
        return await this.objectLoader.async_load_object_with_id(object_id, true, nesting);
    }

    async _convert_object_value_to_dict(mapping, value, nesting: number = 0) {
        switch (mapping.type) {
            case MappingType.Reference:
                return await this._convert_to_reference(mapping, value, nesting + 1);
            case MappingType.MapWithReferenceValues:
                return await this._async_convert_to_reference_map_values(mapping, value, nesting + 1);
            case MappingType.MapWithReferenceKeys:
                return await this._async_convert_to_reference_map_keys(mapping, value, nesting + 1);
            case MappingType.ReferenceList:
                return await this._async_convert_to_reference_list(mapping, value, nesting + 1);
            case MappingType.Property:
                return this.convert_from_js_value_to_db_value(value, mapping);
            case MappingType.NestedObject:
                return await this._async_convert_to_nested_object_dict(mapping, value, nesting + 1);
            case MappingType.NestedObjectList:
                return await this._async_convert_to_nested_object_list_of_dict(mapping, value, nesting + 1);
        }
    }

    private async _convert_to_reference(mapping: PropertyMapping, value: any, nesting: number = 0): Promise<string> {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an array`)
        }
        if (!(value instanceof ObjectWithUUID)) {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a ObjectWithUUID`);
        }
        this.debug(`Convert ${value} to reference`, nesting);
        return await this.async_reference_for_object_and_store_if_doesnt_exist(value, nesting);
    }

    async async_reference_for_object_and_store_if_doesnt_exist(obj: ObjectWithUUID, nesting: number = 0): Promise<string> {
        let reference = this.reference_for_object(obj);
        let exists = await this.objectLoader.async_does_object_with_id_exist(obj.uuid);
        if (!exists) {
            // If the doc was NOT new, it means we have an 'old/existing' object that no longer exists.
            // At this present time, fail, and we'll see what this means later (with more use)
            if (!obj.is_new) {
                throw new Error(`The referenced object ${obj} was not new, it means you have an 'old/existing' object in your graph that no longer exists in the DB.`);
            }

            // Try to store
            this.debug(`Storing object ${obj} as it's not in the DB...`, nesting + 1);
            await this.objectLoader.async_store_or_update_object(obj, false, false);
        }
        return reference;
    }


    private async _async_convert_to_nested_object_dict(mapping: PropertyMapping, value: any, nesting: number = 0) {
        this._check_value_is_typedObject("_async_convert_to_nested_object_dict", value, mapping);
        this.debug(`Converting ${value.constructor.name} by iterating its properties...`, nesting);
        let dict = await this._convert_by_iterating_persistable_properties(value, nesting + 1);
        return this.objectLoader.add_db_specific_properties_to_dict(dict, value, nesting);
    }

    private async _convert_by_iterating_persistable_properties(origin: object, nesting: number = 0): Promise<object> {
        let className = origin.constructor.name;
        const props = this.mapper.propertiesFor(origin.constructor.name);
        const result = {};
        if (props) {
            let propertyNames = Array.from(props.keys());
            this.debug(`Iterating ${props.size} properties of ${className} (${JSON.stringify(propertyNames)}`, nesting);
            for (let propertyName of propertyNames) {
                let mapping = props.get(propertyName);
                let value = origin[propertyName];

                this.debug(`property name:${propertyName}, type:${NameForMappingPropType(mapping.type)}, hint: ${this.describeHints(mapping)}, value:${value}`, nesting);
                result[propertyName] = await this._convert_object_value_to_dict(mapping, value, nesting + 1);
            }

        } else {
            this.debug(`Object has no properties`, nesting);
        }
        return this.objectLoader.add_db_specific_properties_to_dict(result, origin, nesting);
    }


    private async _async_convert_to_nested_object_list_of_dict(mapping: any, value: any, nesting: number = 0) {
        this.debug(`_convert_to_nested_object_list_of_dict: Nested object list: ${SafeJSON.stringify(value)}`, nesting);
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => v.constructor.name))).join(",");
            this.debug(`convert nested list of ${value.length} items, types: ${type_names}`, nesting);

            let resulting_list = [];
            for (let index of Array.from<string>(value.keys())) {
                let v = value[index];

                this._check_value_is_typedObject("_async_convert_to_nested_object_list_of_dict", v, mapping);

                this.debug(`${mapping.name}[${index}]`, nesting + 1);
                resulting_list.push(await this._convert_by_iterating_persistable_properties(v, nesting + 2));
            }
            return resulting_list;
        } else {
            throw new Error(`NESTEDLIST: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }

    private _check_value_is_typedObject(method_name: string, value: any, mapping: PropertyMapping) {
        if (!(value instanceof TypedObject)) {
            throw new Error(`${method_name}: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a TypedObject`);
        }
    }

    private async _async_convert_to_reference_map_keys(mapping: any, jsMapObject: any, nesting: number = 0) {
        let discovered_type_name = GetTheTypeNameOfTheObject(jsMapObject);
        if (discovered_type_name == "map") {
            // A list of {key, value} pairs, where the keys are to be serialized as references
            let reference_map = {};
            this.debug(`convert map(keys) of ${jsMapObject.size} items`, nesting);

            for (let uuidKey of Array.from<ObjectWithUUID>(jsMapObject.keys())) {
                let value = jsMapObject.get(uuidKey);
                this.debug(`converting ${mapping.name}[${uuidKey.uuid}] -> ${value}`, nesting);
                let key_as_reference = await this._convert_to_reference(mapping, uuidKey, nesting);

                // what the heck is the value?
                // at this point we only support primitives. We have no nice way to describe what they should be.
                // so we're just gonna assume it's some JS object
                reference_map[key_as_reference] = await this.convert_from_js_value_to_db_value(value, mapping);
            }
            return reference_map;
        } else {
            throw new Error(`REFKEYS: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${discovered_type_name} (actually, a '${jsMapObject.constructor.name}'). Needs to be a map`);
        }
    }

    private async _async_convert_to_reference_map_values(mapping: any, jsMapObject: any, nesting: number = 0) {
        let discovered_type_name = GetTheTypeNameOfTheObject(jsMapObject);
        if (discovered_type_name == "map") {
            // A list of {key, value} pairs
            let reference_map = {};
            this.debug(`convert map of ${jsMapObject.size} items`, nesting);

            let jsMapKeys = Array.from<any>(jsMapObject.keys());
            for (let mapKey of jsMapKeys) {
                let db_key = this.convert_from_js_value_to_db_value(mapKey, mapping);
                if (isUndefined(db_key) || db_key == null || db_key == "") {
                    throw new Error(`Cannot convert key:${mapKey} to db key (came back ${db_key}). Mapping is: ${JSON.stringify(mapping)}. The keys were: ${SafeJSON.stringify(jsMapKeys)}`);
                }
                let value = jsMapObject.get(mapKey);

                if (GetTheTypeNameOfTheObject(value) == 'array') {
                    this.debug(`converting array of things ${mapping.name}[${db_key}]`, nesting);
                    value = await this._async_convert_to_reference_list(mapping, value, nesting + 1);
                    reference_map[db_key] = value;
                } else {
                    this.debug(`converting ${mapping.name}[${db_key}], ${value}`, nesting);
                    let item_prop = {type: MappingType.Reference, name: `${mapping.name}[${mapKey}}`};
                    reference_map[db_key] = await this._convert_to_reference(item_prop, value, nesting + 1);
                }
            }
            this.debug(`done with map of values: ${mapping.name}`, nesting);
            return reference_map;
        } else {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${discovered_type_name} (actually, a '${jsMapObject.constructor.name}'). Needs to be a map`);
        }
    }

    private async _async_convert_to_reference_list(mapping: any, value: any, nesting: number = 0) {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => {
                return v.constructor.name;
            }))).join(",");

            this.debug(`convert list of ${value.length} items, types: ${type_names}`, nesting);
            let new_reference_list = [];
            let index = 0;
            for (let key of Array.from<string>(value.keys())) {
                let v = value[key];
                this.debug(`converting ${mapping.name}[${index}], ${v.constructor.name}`, nesting);
                let indexes_prop = {type: MappingType.Reference, name: `${mapping.name}[${index}}`};
                new_reference_list.push(await this._convert_to_reference(indexes_prop, v, nesting + 1));
                index++;
            }
            return new_reference_list;
        } else {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be an array`);
        }
    }

    reference_for_object(obj: ObjectWithUUID) {
        return `${REF_PREFIX}:${obj.type}:${obj._id}`;
    }


    gap(width: number): string {
        return " ".repeat(width);
    }

    debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

    private describeHints(mapping: PropertyMapping) {
        if (mapping.hint) {
            return mapping.hint;
        }
        return "none";
    }
}

export {
    OrmConverter
}