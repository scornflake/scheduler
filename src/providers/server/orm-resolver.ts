import {Injectable} from "@angular/core";
import {IObjectStore, IReferenceResolver, ObjectReference, PropertyMapping} from "../mapping/orm-mapper-type";
import {OrmUtils} from "./orm-utils";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {observable} from "mobx-angular";
import {TypedObject} from "../../scheduling/base-types";
import {SafeJSON} from "../../common/json/safe-stringify";

@Injectable()
class StoreBasedResolver implements IReferenceResolver {
    private utils: OrmUtils;

    constructor(private loader: IObjectStore,
                private mapper: OrmMapper) {
        this.utils = new OrmUtils(LoggingWrapper.getLogger('orm.resolver'));
    }

    async async_lookup_list_of_references(references: Array<any>, nesting: number = 0) {
        let new_list = observable([]);
        for (let item of references) {
            let ref: ObjectReference = this.mapper.parse_reference(item);
            new_list.push(await this.async_lookup_object_reference(ref, nesting + 1));
        }
        return new_list;
    }

    async async_lookup_map_of_reference_keys(mapping: PropertyMapping, value: any, nesting: number = 0) {
        // So. The keys will be references.
        // For now, the values are presumed to be primitives.
        let result_map = new Map<TypedObject, any>();
        let reference_keys = Object.keys(value);
        for (let key of reference_keys) {
            let reference = key.toString();
            this.utils.debug(`_lookup_map_of_reference_keys going to try lookup on: ${reference}`, nesting);

            let ref: ObjectReference = this.mapper.parse_reference(reference);
            let reference_obj = await this.async_lookup_object_reference(ref, nesting);
            let js_value = this.mapper.convert_from_db_value_to_js_type(value[key], mapping);
            result_map.set(reference_obj, js_value);
        }
        return result_map;
    }

    async async_lookup_map_of_reference_values(mapping: PropertyMapping, mapWithReferenceValues: any, nesting: number = 0) {
        let result_map = new Map<any, any>();
        this.utils.debug(`_lookup_map_of_reference_values received a value of ${SafeJSON.stringify(mapWithReferenceValues)}`, nesting);

        let reference_keys = Object.keys(mapWithReferenceValues);
        this.utils.debug(`_lookup_map_of_reference_values keys ${SafeJSON.stringify(reference_keys)}`, nesting);
        for (let key of reference_keys) {
            let reference = mapWithReferenceValues["" + key];
            let typeName = GetTheTypeNameOfTheObject(reference);
            let js_key = this.mapper.convert_from_db_value_to_js_type(key, mapping);
            if (typeName == 'array') {
                this.utils.debug(`_lookup_map_of_reference_values looking array of references: ${reference}/${typeName}`, nesting);
                result_map.set(js_key, await this.async_lookup_list_of_references(reference, nesting + 1));
            } else {
                this.utils.debug(`_lookup_map_of_reference_values going to try lookup on: ${reference}/${typeName}`, nesting);
                let ref: ObjectReference = this.mapper.parse_reference(reference);
                result_map.set(js_key, await this.async_lookup_object_reference(ref, nesting + 1));
            }
        }

        return result_map;
    }

    async async_lookup_object_reference(reference: ObjectReference, nesting: number = 0) {
        return await this.loader.async_load_object_with_id(reference.id, true, nesting);
    }

}

export {
    StoreBasedResolver
}