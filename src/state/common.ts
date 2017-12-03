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

    protected add_objects_to_array(many_items: T[]) {
        many_items.forEach(i => this.add_object_to_array(i));
    }

    protected remove_object_from_array(instance: T) {
        this.items = this.items.filter(o => o.uuid != instance.uuid);
    }

    protected clear_all_objects_from_array() {
        this.items = []
    }

    findIndexOfObject(obj: T): number {
        return _.findIndex(this.items, o => obj.uuid == o.uuid);
    }

    findIndex(predicate, fromIndex = 0) {
        return _.findIndex(this.items, predicate, fromIndex);
    }
}

export {
    ObjectWithUUID,
    BaseStore
}