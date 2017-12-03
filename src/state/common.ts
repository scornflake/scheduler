import {observable} from "mobx-angular";
import ShortUniqueId from 'short-unique-id';
import * as _ from 'lodash';

class ObjectWithUUID {
    @observable uuid: string;
    is_new: boolean;

    constructor(uuid: string = null) {
        if (uuid == null) {
            let uuid_gen = new ShortUniqueId();
            uuid = uuid_gen.randomUUID(8);
            this.is_new = true;
        }
        this.uuid = uuid;
    }

    update_from_server(state) {
        // migrate properties to this
        this.uuid = state['id'];
        this.is_new = false;
    }
}

class BaseStore<T extends ObjectWithUUID> {
    @observable protected items: Array<T>;

    constructor() {
        this.items = [];
    }

    protected add_object_to_array(instance: T): T {
        if (_.findIndex(this.items, o => o.uuid == instance.uuid) >= 0) {
            return null;
        }
        this.items.push(instance);
        return instance;
    }

    protected remove_object_from_array(instance: T) {
        this.items = this.items.filter(o => o.uuid != instance.uuid);
    }
}

export {
    ObjectWithUUID,
    BaseStore
}