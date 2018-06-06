import {action, observable} from "mobx";
import * as _ from 'lodash';
import {isUndefined} from "util";
import {SafeJSON} from "../../common/json/safe-stringify";

class PersistableObject {
    @observable type: string;

    constructor() {
        this.type = this.constructor.name;
    }
}

class ObjectWithUUID extends PersistableObject {
    @observable _id: string;
    @observable _rev: string;
    is_new: boolean;

    constructor(uuid: string = null) {
        super();
        if (uuid == null) {
            uuid = this.guid();
        }
        this.is_new = true;
        this._id = uuid;
    }

    guid() {
        return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' +
            this.s4() + '-' + this.s4() + this.s4() + this.s4();
    }

    s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    get uuid(): string {
        return this._id;
    }

    update_from_server(state) {
        // migrate properties to this
        if(state._id) {
            this._id = state['_id'];
        } else {
            throw new Error(`Cannot update ${this.type}, no _id in provided state`);
        }
        if(state._rev) {
            this._rev = state['_rev'];
        } else {
            throw new Error(`Cannot update ${this.type}, no _rev in provided state`);
        }
        this.is_new = false;
    }
}

class BaseStore<T extends ObjectWithUUID> extends ObjectWithUUID {
    @observable items: Array<T>;

    constructor() {
        super();
        this.items = [];
    }

    @action
    add_object_to_array(instance: T, overwrite_existing = false): T {
        if (!instance) {
            throw new Error(`Cannot add 'null' to this list. We are: ${this.constructor.name}s`)
        }
        if (_.findIndex(this.items, o => o.uuid == instance.uuid) >= 0) {
            if (overwrite_existing) {
                this.remove_object_from_array(instance);
            } else {
                return null;
            }
        }
        this.items.push(instance);
        return instance;
    }

    @action
    add_objects_to_array(many_items: T[]) {
        many_items.forEach(i => this.add_object_to_array(i));
    }

    @action
    remove_object_from_array(instance: T) {
        this.items = this.items.filter(o => o.uuid != instance.uuid);
    }

    @action
    protected clear_all_objects_from_array() {
        this.items = []
    }

    find_by_uuid(uuid: string): T {
        return this.items.find(v => v.uuid == uuid);
    }

    findIndexOfObject(obj: T): number {
        return _.findIndex(this.items, o => obj.uuid == o.uuid);
    }

    findIndex(predicate, fromIndex = 0) {
        return _.findIndex(this.items, predicate, fromIndex);
    }
}

function check_if_undefined(thing, message) {
    if (thing == null || isUndefined(thing)) {
        throw Error(message);
    }
}

function try_find_single_person_with(list, callback) {
    let results = list.filter(callback);
    if (results.length) {
        if (results.length > 1) {
            throw new Error(`Searching for ${name} returns more than one thing. Returns: ${SafeJSON.stringify(results)}`);
        }
        return results[0];
    }
    return null;
}

function find_object_with_name(list: Array<any>, name: string, fuzzy_match: boolean = false) {
    if (isUndefined(name)) {
        return null;
    }
    let person = try_find_single_person_with(list, obj => obj.name.toLocaleLowerCase() == name.toLocaleLowerCase());
    if (!person && fuzzy_match) {
        person = try_find_single_person_with(list, obj => obj.name.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()));
        if (!person) {
            // Try first word and first char of 2nd word
            let terms = name.split(' ');
            if (terms.length > 1) {
                let search = `${terms[0]} ${terms[1][0]}`.toLocaleLowerCase();
                // console.log(`Try ${search} for ${name}`);
                person = try_find_single_person_with(list, obj => obj.name.toLocaleLowerCase().startsWith(search));
            }
        }
    }
    return person;
}

function delete_from_array<T>(array: Array<T>, object: T) {
    array.forEach((item, index) => {
        if (item == object) {
            array.splice(index, 1);
        }
    });
}

export {
    ObjectWithUUID,
    PersistableObject,
    BaseStore,
    check_if_undefined,
    delete_from_array,
    find_object_with_name
}