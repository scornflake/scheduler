import {
    IObjectLoader,
    MappingType,
    NameForMappingPropType,
    PropertyHint,
    PropertyMapping,
    REF_PREFIX
} from "../mapping/orm-mapper-type";
import {ObjectWithUUID, TypedObject} from "../../scheduling/common/base_model";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";
import * as moment from "moment";
import {isUndefined} from "util";

class OrmConverter {
    private mapper: OrmMapper;
    private logger: Logger;
    private object_loader: IObjectLoader;

    constructor(mapper: OrmMapper, loader: IObjectLoader) {
        this.mapper = mapper;
        this.object_loader = loader;
        this.logger = LoggingWrapper.getLogger('db.converter');
    }

    async async_create_dict_from_js_object(object: TypedObject, nesting: number = 0) {
        this.persistence_debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        return await this._convert_object_value_to_dict({
            type: MappingType.NestedObject,
            name: 'root'
        }, object, nesting);
    }

    async async_create_js_object_from_dict(json_obj: object, new_object_type: string, nesting: number = 0) {
        /*
        Assumption is that we begin with an object that has an ID and a type.
         */
        let new_object = this.mapper.createNewInstanceOfType(new_object_type);
        if (new_object == null) {
            throw new Error(`Failed to instantiate new object of type ${new_object_type}. Is the mapper configured with the right factories?`);
        }
        const targetProperties = this.mapper.propertiesFor(new_object.constructor.name);
        if (targetProperties.size == 0) {
            throw new Error(`Cannot hydrate ${json_obj['type']} because we don't know what it's persistable properties are`)
        }

        if (new_object instanceof ObjectWithUUID) {
            let fields = new_object.update_from_server(json_obj);
            if (fields.length) {
                this.persistence_debug(`Set ${fields.join("/")} from doc`, nesting);
            }
        }

        // Now we need to go through the properties, and hydrate each and assign
        for (let propertyName of Array.from(targetProperties.keys())) {
            let mapping: PropertyMapping = targetProperties.get(propertyName);
            let value = json_obj[propertyName];

            if (propertyName == 'type') {
                // No reason why this shouldn't be the case, but you know, paranoia
                if (new_object.type != json_obj['type']) {
                    throw new Error(`Unable to hydrate ${json_obj} into object. Type ${new_object.type} != ${json_obj['type']}`);
                }
            } else {
                if (value == null) {
                    this.persistence_debug(`Skipping ${propertyName}, its null`, nesting);
                    continue;
                }

                switch (mapping.type) {
                    case MappingType.Property: {
                        this.persistence_debug(`${propertyName} = ${value}`, nesting);
                        new_object[propertyName] = json_obj[propertyName];
                        break;
                    }

                    /*
                    Expect the value to be a blob representing the new object.  Create it, then set it as the property
                     */
                    case MappingType.NestedObject: {
                        let new_type = value['type'];
                        this.persistence_debug(`${propertyName} = new instance of ${new_type}`, nesting);
                        new_object[propertyName] = await this.async_create_js_object_from_dict(value, new_type, nesting + 1);
                        break;
                    }

                    case MappingType.NestedObjectList: {
                        let new_objects = [];
                        this.persistence_debug(`${propertyName} = list of ${value.length} objects ...`, nesting);
                        for (let v of value) {
                            let new_type = v['type'];
                            this.persistence_debug(`creating new instance of ${new_type}`, nesting + 1);
                            let the_item = await this.async_create_js_object_from_dict(v, new_type, nesting + 2);
                            if (the_item == null) {
                                throw new Error(`Odd. Converting an instance of ${v} to object, but got 'nothing' back`);
                            }
                            new_objects.push(the_item);
                        }
                        new_object[propertyName] = new_objects;
                        break;
                    }

                    case MappingType.Reference: {
                        this.persistence_debug(`${propertyName} = reference: ${value}`, nesting);
                        new_object[propertyName] = await this._lookup_object_reference(value, nesting + 1);
                        break;
                    }

                    case MappingType.ReferenceList: {
                        // Assume 'value' is a list of object references
                        this.persistence_debug(`${propertyName} = list of ${value.length} references`, nesting);
                        new_object[propertyName] = await this._lookup_list_of_references(value, nesting + 1);
                        this.persistence_debug(`    ... got ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    case MappingType.ReferenceMap: {
                        this.persistence_debug(`${propertyName} = map of ${value.size} references`, nesting);
                        new_object[propertyName] = await this._lookup_map_of_references(mapping, value, nesting + 1);
                        this.persistence_debug(`    ... got ${new_object[propertyName]}`, nesting);
                        break;
                    }

                    default: {
                        throw new Error(`Fail. Dunno how to handle: ${mapping.name} of type ${mapping.type}`);
                    }
                }
            }
        }
        return new_object;
    }

    private async _lookup_map_of_references(mapping: PropertyMapping, value: any, nesting: number) {
        // Rrrr-um: now do we type the map?
        let result_map = new Map<any, any>();
        this.logger.debug(`_lookup_map_of_references received a value of ${SafeJSON.stringify(value)}`);
        let reference_keys = Object.keys(value);
        this.logger.debug(`_lookup_map_of_references keys ${SafeJSON.stringify(reference_keys)}`);
        for (let key of reference_keys) {
            let reference = value["" + key];
            this.logger.debug(`_lookup_map_of_references going to try lookup on: ${reference}`);
            let js_key = this.convert_from_db_value_to_js_type(key, mapping);
            result_map.set(js_key, await this._lookup_object_reference(reference, nesting + 1));
        }
        return result_map;
    }

    convert_from_js_value_to_db_value(thing: any, mapping: PropertyMapping) {
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

    convert_from_db_value_to_js_type(propertyName: string, mapping: PropertyMapping) {
        if (mapping.hint == PropertyHint.Date) {
            let a_date = moment(propertyName);
            if (!a_date.isValid()) {
                throw new Error(`Could not parse ${propertyName} into a Date. For property: ${mapping.name}`);
            }
            return a_date.toDate();
        }
        return propertyName;
    }

    private async _lookup_list_of_references(value, nesting: number = 0) {
        let new_list = [];
        for (let item of value) {
            new_list.push(await this._lookup_object_reference(item, nesting + 1));
        }
        return new_list;
    }


    private async _lookup_object_reference(reference: string, nesting: number = 0) {
        let parts = reference.split(':');
        if (parts.length != 3) {
            throw new Error(`Invalid reference ${reference}. Expected 3 parts`);
        }
        if (parts[0] != REF_PREFIX) {
            throw new Error(`Invalid reference ${reference}. Expected part[0] to be 'ref'`);
        }
        let object_id = parts[2];
        return await this.object_loader.async_load_object_with_id(object_id, nesting);
    }

    async _convert_object_value_to_dict(mapping, value, nesting: number = 0) {
        switch (mapping.type) {
            case MappingType.Reference:
                return await this._convert_to_reference(mapping, value, nesting + 1);
            case MappingType.ReferenceMap:
                return this._async_convert_to_reference_map(mapping, value, nesting + 1);
            case MappingType.ReferenceList:
                return this._async_convert_to_reference_list(mapping, value, nesting + 1);
            case MappingType.Property:
                return this.convert_from_js_value_to_db_value(value, mapping);
            case MappingType.NestedObject:
                return this._async_convert_to_nested_object_dict(mapping, value, nesting + 1);
            case MappingType.NestedObjectList:
                return this._async_convert_to_nested_object_list_of_dict(mapping, value, nesting + 1);
        }
    }

    private async _convert_to_reference(mapping: PropertyMapping, value: any, nesting: number = 0) {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an array`)
        }
        if (!(value instanceof ObjectWithUUID)) {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a ObjectWithUUID`);
        }
        this.persistence_debug(`Convert ${value} to reference`, nesting);
        return await this.async_reference_for_object_and_store_if_doesnt_exist(value, nesting);
    }

    async async_reference_for_object_and_store_if_doesnt_exist(obj: ObjectWithUUID, nesting: number = 0) {
        let reference = this.reference_for_object(obj);
        let exists = await this.object_loader.async_does_object_with_id_exist(obj.uuid);
        if (!exists) {
            // If the doc was NOT new, it means we have an 'old/existing' object that no longer exists.
            // At this present time, fail, and we'll see what this means later (with more use)
            if (!obj.is_new) {
                throw new Error(`The referenced object ${obj} was not new, it means you have an 'old/existing' object in your graph that no longer exists in the DB.`);
            }

            // Try to store
            this.persistence_debug(`Storing object ${obj} as it's not in the DB...`, nesting + 1);
            await this.object_loader.async_store_or_update_object(obj, false, false);
        }
        return reference;
    }


    private async _async_convert_to_nested_object_dict(mapping: PropertyMapping, value: any, nesting: number = 0) {
        if (!(value instanceof TypedObject)) {
            throw new Error(`NESTED OBJ: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a TypedObject`);
        }
        this.persistence_debug(`Converting ${value.constructor.name} by iterating its properties...`, nesting);
        let dict = await this._convert_by_iterating_persistable_properties(value, nesting + 1);
        return this.object_loader.add_db_specific_properties_to_dict(dict, value, nesting);
    }

    private async _convert_by_iterating_persistable_properties(origin: object, nesting: number = 0): Promise<object> {
        let className = origin.constructor.name;
        const props = this.mapper.propertiesFor(origin.constructor.name);
        const result = {};
        if (props) {
            let propertyNames = Array.from(props.keys());
            this.persistence_debug(`Iterating ${props.size} properties of ${className} (${JSON.stringify(propertyNames)}`, nesting);
            for (let propertyName of propertyNames) {
                let mapping = props.get(propertyName);
                let value = origin[propertyName];
                this.persistence_debug(`property name:${propertyName}, type:${NameForMappingPropType(mapping.type)}, hint: ${mapping.hint}, value:${value}`, nesting);
                result[propertyName] = await this._convert_object_value_to_dict(mapping, value, nesting + 1);
            }

        } else {
            this.persistence_debug(`Object has no properties`, nesting);
        }
        return this.object_loader.add_db_specific_properties_to_dict(result, origin, nesting);
    }


    private async _async_convert_to_nested_object_list_of_dict(mapping: any, value: any, nesting: number = 0) {
        /*
        Fix: return [] if undefined or null. But why happen?
         */
        this.persistence_debug(`_convert_to_nested_object_list_of_dict: Nested object list: ${SafeJSON.stringify(value)}`, nesting);
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let type_names = Array.from(new Set(value.map(v => v.constructor.name))).join(",");
            this.persistence_debug(`convert nested list of ${value.length} items, types: ${type_names}`, nesting);

            let resulting_list = [];
            for (let index of Array.from<string>(value.keys())) {
                let v = value[index];
                this.persistence_debug(`${mapping.name}[${index}]`, nesting + 1);
                resulting_list.push(await this._convert_by_iterating_persistable_properties(v, nesting + 2));
            }
            return resulting_list;
        } else {
            throw new Error(`NESTEDLIST: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.constructor.name}. Needs to be a list or mbox list`);
        }
    }

    private async _async_convert_to_reference_map(mapping: any, jsMapObject: any, nesting: number = 0) {
        let discovered_type_name = GetTheTypeNameOfTheObject(jsMapObject);
        if (discovered_type_name == "map") {
            // A list of {key, value} pairs
            let reference_map = {};
            this.persistence_debug(`convert map of ${jsMapObject.size} items`, nesting);

            for (let mapKey of Array.from<string>(jsMapObject.keys())) {
                let value = jsMapObject.get(mapKey);
                this.persistence_debug(`converting ${mapping.name}[${mapKey}], ${value}`, nesting);
                let item_prop = {type: MappingType.Reference, name: `${mapping.name}[${mapKey}}`};
                let db_key = this.convert_from_js_value_to_db_value(mapKey, mapping);
                reference_map[db_key] = await this._convert_to_reference(item_prop, value, nesting + 1);
            }
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

            this.persistence_debug(`convert list of ${value.length} items, types: ${type_names}`, nesting);
            let new_reference_list = [];
            let index = 0;
            for (let key of Array.from<string>(value.keys())) {
                let v = value[key];
                this.persistence_debug(`converting ${mapping.name}[${index}], ${v.constructor.name}`, nesting);
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

    persistence_debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

}

export {
    OrmConverter
}