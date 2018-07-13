import {IObjectStore, MappingType, NameForMappingPropType, PropertyMapping} from "../mapping/orm-mapper-type";
import {ObjectWithUUID, TypedObject} from "../../scheduling/base-types";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {OrmUtils} from "./orm-utils";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {isUndefined} from "util";

class OrmConverterWriter {
    ignoreOldObjectsWhenUpdating: boolean = false;

    private logger: Logger;
    private utils: OrmUtils;

    constructor(private mapper: OrmMapper,
                private objectLoader: IObjectStore
    ) {
        this.logger = LoggingWrapper.getLogger('orm.writer');
        this.utils = new OrmUtils(this.logger);
    }

    async async_createDocFromJSObject(object: TypedObject, nesting: number = 0) {
        // this.utils.debug(`Persisting object: ${object.type}, ${SafeJSON.stringify(object)}`, nesting);
        // At this level, if we're given an ObjectWithUUID, we don't want a reference.
        // So we tell the converter it's a nested object (it'll output id/rev/type)
        return await this._convertObjectValueToDict({
            type: MappingType.NestedObject,
            name: 'root'
        }, object, nesting);
    }

    async _convertObjectValueToDict(mapping, value: TypedObject, nesting: number = 0) {
        if (value == null) {
            return null;
        }
        switch (mapping.type) {
            case MappingType.Reference:
                return await this._convertToReference(mapping, value, nesting + 1);
            case MappingType.MapWithReferenceValues:
                return await this._asyncConvertToReferenceMapValues(mapping, value, nesting + 1);
            case MappingType.MapWithReferenceKeys:
                return await this._asyncConvertToReferenceMapKeys(mapping, value, nesting + 1);
            case MappingType.ReferenceList:
                return await this._asyncConvertToReferenceList(mapping, value, nesting + 1);
            case MappingType.Property:
                return this.mapper.convertJSValueToDocValue(value, mapping);
            case MappingType.NestedObject:
                return await this._asyncConvertToNestedObjectDict(mapping, value, nesting + 1);
            case MappingType.NestedObjectList:
                return await this._asyncConvertToNestedObjectListOfDict(mapping, value, nesting + 1);
        }
    }

    private async _convertToReference(mapping: PropertyMapping, value: TypedObject, nesting: number = 0): Promise<string> {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an array`)
        }
        if (!(value instanceof ObjectWithUUID)) {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${value.type}. Needs to be a ObjectWithUUID`);
        }
        this.utils.debug(`Convert ${value} to reference`, nesting);
        return await this.async_getReferenceForObjectAndStoreIfItDoesntExist(value, nesting);
    }

    async async_getReferenceForObjectAndStoreIfItDoesntExist(obj: ObjectWithUUID, nesting: number = 0): Promise<string> {
        let reference = this.mapper.referenceForObject(obj);
        let exists = await this.objectLoader.async_DoesObjectExistWithUUID(obj.uuid);
        if (!exists) {
            // If the doc was NOT new, it means we have an 'old/existing' object that isn't in the DB.
            //
            // For tests, this is possible because an object such as a role could be created, used across a few tests (where the test deletes the DB)
            // but is still in memory (with is_new === false) for the next test.
            // The 'ignoreOldObjectsWhenUpdating' flag is here JUST for this reason.
            //
            // At this present time, fail, and we'll see what this means later (with more use)
            if (!obj.is_new && !this.ignoreOldObjectsWhenUpdating) {
                throw new Error(`The referenced object ${obj.type}/${obj} was not new, it means you have an 'old/existing' object in your graph that no longer exists in the DB.`);
            }

            // Try to store
            this.utils.debug(`Storing object ${obj} as it's not in the DB...`, nesting + 1);
            await this.objectLoader.async_storeOrUpdateObject(obj, false, false);
        }
        return reference;
    }

    private async _asyncConvertToNestedObjectDict(mapping: PropertyMapping, value: TypedObject, nesting: number = 0) {
        this._check_value_is_typedObject("_asyncConvertToNestedObjectDict", value, mapping);
        this.utils.debug(`Converting ${value.type} by iterating its properties...`, nesting);
        let dict = await this._convert_by_iterating_persistable_properties(value, nesting + 1);
        return this.objectLoader.addDBSpecificPropertiesToDict(dict, value, nesting);
    }

    private async _convert_by_iterating_persistable_properties(origin: TypedObject, nesting: number = 0): Promise<object> {
        let className = origin.type;
        let props: Map<string, PropertyMapping>;
        try {
            props = this.mapper.propertiesFor(className);
        } catch (err) {
            throw new Error(`Cannot get properties for iteration: ${className}, nesting: ${nesting}. Original: ${err}.`);
        }
        const result = {};
        if (props) {
            let propertyNames = Array.from(props.keys());
            this.utils.debug(`Iterating ${props.size} properties of ${className} (${JSON.stringify(propertyNames)}`, nesting);
            for (let propertyName of propertyNames) {
                let mapping = props.get(propertyName);
                let value = origin[propertyName];

                this.utils.debug(`property name:${propertyName}, type:${NameForMappingPropType(mapping.type)}, hint: ${this.mapper.describeHints(mapping)}, value:${value}`, nesting);
                result[propertyName] = await this._convertObjectValueToDict(mapping, value, nesting + 1);
            }

        } else {
            this.utils.debug(`Object has no properties`, nesting);
        }
        return this.objectLoader.addDBSpecificPropertiesToDict(result, origin, nesting);
    }


    private async _asyncConvertToNestedObjectListOfDict(mapping: any, value: any, nesting: number = 0) {
        this.utils.debug(`_convert_to_nested_object_list_of_dict: Nested object list: ${SWBSafeJSON.stringify(value)}`, nesting);
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let typeNames = Array.from(new Set(value.map(v => {
                if(!(v instanceof TypedObject)) {
                    throw new Error(`Items of a nested object list must derive from TypedObject. Got: ${SWBSafeJSON.stringify(v)}`);
                }
                return v.type;
            }))).join(",");
            this.utils.debug(`convert nested list of ${value.length} items, types: ${typeNames}`, nesting);

            let resulting_list = [];
            for (let index of Array.from<string>(value.keys())) {
                let v = value[index];

                this._check_value_is_typedObject("_asyncConvertToNestedObjectListOfDict", v, mapping);

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

    private async _asyncConvertToReferenceMapKeys(mapping: any, jsMapObject: any, nesting: number = 0) {
        let discovered_type_name = GetTheTypeNameOfTheObject(jsMapObject);
        if (discovered_type_name == "map") {
            // A list of {key, value} pairs, where the keys are to be serialized as references
            let reference_map = {};
            this.utils.debug(`convert map(keys) of ${jsMapObject.size} items`, nesting);

            for (let uuidKey of Array.from<ObjectWithUUID>(jsMapObject.keys())) {
                let value = jsMapObject.get(uuidKey);
                this.utils.debug(`converting ${mapping.name}[${uuidKey.uuid}] -> ${value}`, nesting);
                let key_as_reference = await this._convertToReference(mapping, uuidKey, nesting);

                // what the heck is the value?
                // at this point we only support primitives. We have no nice way to describe what they should be.
                // so we're just gonna assume it's some JS object
                reference_map[key_as_reference] = await this.mapper.convertJSValueToDocValue(value, mapping);
            }
            return reference_map;
        } else {
            throw new Error(`REFKEYS: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${discovered_type_name} (actually, a '${jsMapObject.constructor.name}'). Needs to be a map`);
        }
    }

    private async _asyncConvertToReferenceMapValues(mapping: any, jsMapObject: any, nesting: number = 0) {
        let discovered_type_name = GetTheTypeNameOfTheObject(jsMapObject);
        if (discovered_type_name == "map") {
            // A list of {key, value} pairs
            let reference_map = {};
            this.utils.debug(`convert map of ${jsMapObject.size} items`, nesting);

            let jsMapKeys = Array.from<any>(jsMapObject.keys());
            for (let mapKey of jsMapKeys) {
                let db_key = this.mapper.convertJSValueToDocValue(mapKey, mapping);
                if (isUndefined(db_key) || db_key == null || db_key == "") {
                    throw new Error(`Cannot convert key:${mapKey} to db key (came back ${db_key}). Mapping is: ${JSON.stringify(mapping)}. The keys were: ${SWBSafeJSON.stringify(jsMapKeys)}`);
                }
                let value = jsMapObject.get(mapKey);

                if (GetTheTypeNameOfTheObject(value) == 'array') {
                    this.utils.debug(`converting array of things ${mapping.name}[${db_key}]`, nesting);
                    value = await this._asyncConvertToReferenceList(mapping, value, nesting + 1);
                    reference_map[db_key] = value;
                } else {
                    this.utils.debug(`converting ${mapping.name}[${db_key}], ${value}`, nesting);
                    let item_prop = {type: MappingType.Reference, name: `${mapping.name}[${mapKey}}`};
                    reference_map[db_key] = await this._convertToReference(item_prop, value, nesting + 1);
                }
            }
            this.utils.debug(`done with map of values: ${mapping.name}`, nesting);
            return reference_map;
        } else {
            throw new Error(`REF: Cannot convert ${mapping.name} to ${NameForMappingPropType(mapping.type)}, it is an ${discovered_type_name} (actually, a '${jsMapObject.constructor.name}'). Needs to be a map`);
        }
    }

    private async _asyncConvertToReferenceList(mapping: any, value: any, nesting: number = 0) {
        if (GetTheTypeNameOfTheObject(value) == "array") {
            let typeNames = Array.from(new Set(value.map(v => {
                if(!(v instanceof TypedObject)) {
                    throw new Error(`Items of a reference list must derive from TypedObject. Got: ${SWBSafeJSON.stringify(v)}`);
                }
                return v.constructor.name;
            }))).join(",");

            this.utils.debug(`convert list of ${value.length} items, types: ${typeNames}`, nesting);
            let new_reference_list = [];
            let index = 0;
            for (let key of Array.from<string>(value.keys())) {
                let v = value[key];
                this.utils.debug(`converting ${mapping.name}[${index}], ${v.constructor.name}`, nesting);
                let indexes_prop = {type: MappingType.Reference, name: `${mapping.name}[${index}}`};
                new_reference_list.push(await this._convertToReference(indexes_prop, v, nesting + 1));
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