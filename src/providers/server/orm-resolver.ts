import {IObjectStore, IReferenceResolver, ObjectReference, PropertyMapping} from "../mapping/orm-mapper-type";
import {OrmUtils} from "./orm-utils";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../mapping/orm-mapper";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {observable} from "mobx-angular";
import {TypedObject} from "../../scheduling/base-types";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Logger, LoggingService} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {filter, flatMap, take, timeout} from "rxjs/operators";

class StoreBasedResolver implements IReferenceResolver {
    private utils: OrmUtils;
    private logger: Logger;

    maxTimeToWaitForReference: number = 5000;

    constructor(private loader: IObjectStore,
                private logService: LoggingService,
                private mapper: OrmMapper) {
        this.logger = logService.getLogger('orm.resolver');
        this.utils = new OrmUtils(this.logger);
    }

    async async_lookupListOfReferences(references: Array<any>, nesting: number = 0) {
        let new_list = observable([]);
        for (let item of references) {
            let ref: ObjectReference = this.mapper.parseReference(item);
            let object = await this.async_lookupObjectReference(ref, nesting + 1);
            new_list.push(object);
        }
        return new_list;
    }

    async async_lookupMapOfReferenceKeys(mapping: PropertyMapping, value: any, nesting: number = 0) {
        // So. The keys will be references.
        // For now, the values are presumed to be primitives.
        let result_map = new Map<TypedObject, any>();
        let reference_keys = Object.keys(value);
        for (let key of reference_keys) {
            let reference = key.toString();
            this.utils.debug(`_lookup_map_of_reference_keys going to try lookup on: ${reference}`, nesting);

            let ref: ObjectReference = this.mapper.parseReference(reference);
            let reference_obj = await this.async_lookupObjectReference(ref, nesting);
            let js_value = this.mapper.convertDocValueToJSValue(value[key], mapping);
            result_map.set(reference_obj, js_value);
        }
        return result_map;
    }

    async async_lookupMapOfReferenceValues(mapping: PropertyMapping, mapWithReferenceValues: any, nesting: number = 0) {
        let result_map = new Map<any, any>();
        this.utils.debug(`_lookup_map_of_reference_values received a value of ${SWBSafeJSON.stringify(mapWithReferenceValues)}`, nesting);

        let reference_keys = Object.keys(mapWithReferenceValues);
        this.utils.debug(`_lookup_map_of_reference_values keys ${SWBSafeJSON.stringify(reference_keys)}`, nesting);
        for (let key of reference_keys) {
            let reference = mapWithReferenceValues["" + key];
            let typeName = GetTheTypeNameOfTheObject(reference);
            let js_key = this.mapper.convertDocValueToJSValue(key, mapping);
            if (typeName == 'array') {
                this.utils.debug(`_lookup_map_of_reference_values looking array of references: ${reference}/${typeName}`, nesting);
                result_map.set(js_key, await this.async_lookupListOfReferences(reference, nesting + 1));
            } else {
                this.utils.debug(`_lookup_map_of_reference_values going to try lookup on: ${reference}/${typeName}`, nesting);
                let ref: ObjectReference = this.mapper.parseReference(reference);
                result_map.set(js_key, await this.async_lookupObjectReference(ref, nesting + 1));
            }
        }

        return result_map;
    }

    // The polling function
    // private poll(fn, timeout, interval) {
    //     let endTime = Number(new Date()) + (timeout || 2000);
    //     interval = interval || 100;
    //
    //     let checkCondition = function (resolve, reject) {
    //         // If the condition is met, we're done!
    //         let result = fn();
    //         if (result) {
    //             resolve(result);
    //         }
    //         // If the condition isn't met but the timeout hasn't elapsed, go again
    //         else if (Number(new Date()) < endTime) {
    //             setTimeout(checkCondition, interval, resolve, reject);
    //         }
    //         // Didn't match and too much time, reject!
    //         else {
    //             reject(new Error('timed out for ' + fn + ': ' + arguments));
    //         }
    //     };
    //     return new Promise(checkCondition);
    // }


    private assertNewValueNotNull(value: any, ref: ObjectReference) {
        if (value == null) {
            let message = `ObjectNotFound error: Tried to lookup: ${JSON.stringify(ref)}. Not found.`;
            this.logger.error(message);
            throw new Error(message);
        }
    }

    async async_lookupObjectReference(reference: ObjectReference, nesting: number = 0) {
        let object = await this.loader.async_LoadObjectWithUUID(reference.id, true, nesting);
        if (object == null && this.maxTimeToWaitForReference > 0) {
            this.logger.info(`Begin waiting for reference ${SWBSafeJSON.stringify(reference)} to exist...`);
            object = await Observable.timer(200, 500).pipe(
                timeout(this.maxTimeToWaitForReference),
                flatMap(p => {
                    this.logger.info(`Poll for reference ${SWBSafeJSON.stringify(reference)} to exist...`);
                    return this.loader.async_LoadObjectWithUUID(reference.id, false, nesting)
                }),
                filter(p => p != null),
                take(1)
            ).toPromise()
        }
        this.assertNewValueNotNull(object, reference);
        return object;
    }

}

export {
    StoreBasedResolver
}