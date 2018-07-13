import {ObjectWithUUID} from "../../scheduling/base-types";

interface IObjectCache {
    getFromCache(uuid: string): ObjectWithUUID;

    saveInCache(object: ObjectWithUUID): void;

    evict(object: ObjectWithUUID | string): void;
}

class SimpleCache implements IObjectCache {
    private _cache = new Map<string, ObjectWithUUID>();

    evict(object: ObjectWithUUID | string): void {
        if (object instanceof ObjectWithUUID) {
            this._cache.delete(object.uuid);
        } else {
            this._cache.delete(object);
        }
    }

    saveInCache(object: ObjectWithUUID): void {
        this._cache.set(object.uuid, object);
    }

    getFromCache(uuid: string): ObjectWithUUID {
        return this._cache.get(uuid);
    }
}

export {
    IObjectCache,
    SimpleCache
}