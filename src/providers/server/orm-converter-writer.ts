import {
    IObjectStore,
    IReferenceResolver,
    MappingType,
    NameForMappingPropType,
    PropertyMapping
} from "../mapping/orm-mapper-type";
import {ObjectWithUUID, TypedObject} from "../../scheduling/base-types";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {SafeJSON} from "../../common/json/safe-stringify";
import {OrmUtils} from "./orm-utils";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {isUndefined} from "util";
import {IObjectCache} from "../mapping/cache";

class OrmConverterWriter {
    private logger: Logger;
    private utils: OrmUtils;

    constructor(private mapper: OrmMapper,
                private objectLoader: IObjectStore,
                private cache: IObjectCache
    ) {
        this.logger = LoggingWrapper.getLogger('orm.writer');
        this.utils = new OrmUtils(this.logger);
    }

    setCache(cache: IObjectCache) {
        this.cache = cache;
    }

    async async_create_dict_from_js_object(object: TypedObject, nesting: number = 0) {
        this.utils.debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        return await this._convert_object_value_to_dict({
            type: MappingType.NestedObject,
            name: 'root'
        }, object, nesting);
    }

    async _convert_object_value_to_dict(mapping, value, nesting: number = 0) {
        if (value == null) {
            return null;
        }
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
                return this.mapper.convert_from_js_value_to_db_value(value, mapping);
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
        this.utils.debug(`Convert ${value} to reference`, nesting);
        return await this.async_reference_for_object_and_store_if_doesnt_exist(value, nesting);
    }

    async async_reference_for_object_and_store_if_doesnt_exist(obj: ObjectWithUUID, nesting: number = 0): Promise<string> {
        let reference = this.mapper.reference_for_object(obj);
        let exists = await this.objectLoader.async_does_object_with_id_exist(obj.uuid);
        if (!exists) {
            // If the doc was NOT new, it means we have an 'old/existing' object that no longer exists.
            // At this present time, fail, and we'll see what this means later (with more use)
            if (!obj.is_new) {
                throw new Error(`The referenced object ${obj.type}/${obj} was not new, it means you have an 'old/existing' object in your graph that no longer exists in the DB.`);
            }

            // Try to store
            this.utils.debug(`Storing object ${obj} as it's not in the DB...`, nesting + 1);
            await this.objectLoader.async_store_or_update_object(obj, false, false);
        }
        return reference;
    }

    private async _async_convert_to_nested_object_dict(mapping: PropertyMapping, value: any, nesting: number = 0) {
        this._check_value_is_typedObject("_async_convert_to_nested_object_dict", value, mapping);
        this.utils.debug(`Converting ${value.constructor.name} by iterating its properties...`, nesting);
        let dict = await this._convert_by_iterating_persistable_properties(value, nesting + 1);
        return this.objectLoader.add_db_specific_properties_to_dict(dict, value, nesting);
    }

    private async _convert_by_iterating_persistable_properties(origin: object, nesting: number = 0): Promise<object> {
        let className = origin.constructor.name;
        const props = this.mapper.propertiesFor(origin.constructor.name);
        const result = {};
        if (props) {
            let propertyNames = Array.from(props.keys());
            this.utils.debug(`Iterating ${props.size} properties of ${className} (${JSON.stringify(propertyNames)}`, nesting);
            for (let propertyName of propertyNames) {
                let mapping = props.get(propertyName);
                let value = origin[propertyName];

                this.utils.debug(`property name:${propertyName}, type:${NameForMappingPropType(mapping.type)}, hint: ${this.mapper.describeHints(mapping)}, value:${value}`, nesting);
                result[propertyName] = await this._convert_object_value_to_dict(mapping, value, nesting + 1);
            }

        } else {
            this.utils.debug(`Object has no properties`, nesting);
        }
        return this.objectLoader.add_db_specific_properties_to_dict(result, origin, nesting);
    }


    private async _async_convert_to_nested_object_list_of_dict(mapping: any, value: any, nesting: number = 0) {
        this.utils.debug(`_convert_to_nested_object_list_of_dict: Nested object list: ${SafeJSON.stringify(value)}`, nesting);
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => v.constructor.name))).join(",");
            this.utils.debug(`convert nested list of ${value.length} items, types: ${type_names}`, nesting);

            let resulting_list = [];
            for (let index of Array.from<string>(value.keys())) {
                let v = value[index];

                this._check_value_is_typedObject("_async_convert_to_nested_object_list_of_dict", v, mapping);

                this.utils.debug(`${mapping.name}[${index}]`, nesting + 1);
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
            this.utils.debug(`convert map(keys) of ${jsMapObject.size} items`, nesting);

            for (let uuidKey of Array.from<ObjectWithUUID>(jsMapObject.keys())) {
                let value = jsMapObject.get(uuidKey);
                this.utils.debug(`converting ${mapping.name}[${uuidKey.uuid}] -> ${value}`, nesting);
                let key_as_reference = await this._convert_to_reference(mapping, uuidKey, nesting);

                // what the heck is the value?
                // at this point we only support primitives. We have no nice way to describe what they should be.
                // so we're just gonna assume it's some JS object
                reference_map[key_as_reference] = await this.mapper.convert_from_js_value_to_db_value(value, mapping);
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
            this.utils.debug(`convert map of ${jsMapObject.size} items`, nesting);

            let jsMapKeys = Array.from<any>(jsMapObject.keys());
            for (let mapKey of jsMapKeys) {
                let db_key = this.mapper.convert_from_js_value_to_db_value(mapKey, mapping);
                if (isUndefined(db_key) || db_key == null || db_key == "") {
                    throw new Error(`Cannot convert key:${mapKey} to db key (came back ${db_key}). Mapping is: ${JSON.stringify(mapping)}. The keys were: ${SafeJSON.stringify(jsMapKeys)}`);
                }
                let value = jsMapObject.get(mapKey);

                if (GetTheTypeNameOfTheObject(value) == 'array') {
                    this.utils.debug(`converting array of things ${mapping.name}[${db_key}]`, nesting);
                    value = await this._async_convert_to_reference_list(mapping, value, nesting + 1);
                    reference_map[db_key] = value;
                } else {
                    this.utils.debug(`converting ${mapping.name}[${db_key}], ${value}`, nesting);
                    let item_prop = {type: MappingType.Reference, name: `${mapping.name}[${mapKey}}`};
                    reference_map[db_key] = await this._convert_to_reference(item_prop, value, nesting + 1);
                }
            }
            this.utils.debug(`done with map of values: ${mapping.name}`, nesting);
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

            this.utils.debug(`convert list of ${value.length} items, types: ${type_names}`, nesting);
            let new_reference_list = [];
            let index = 0;
            for (let key of Array.from<string>(value.keys())) {
                let v = value[key];
                this.utils.debug(`converting ${mapping.name}[${index}], ${v.constructor.name}`, nesting);
                let indexes_prop = {type: MappingType.Reference, name: `${mapping.name}[${index}}`};
                new_reference_list.push(await this._convert_to_reference(indexes_prop, v, nesting + 1));
                index++;
            }
            return new_reference_list;
        } else {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be an array`);
        }
    }
}

export {
    OrmConverterWriter
}