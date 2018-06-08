import {action, observable} from "mobx-angular";
import * as _ from 'lodash';
import {isUndefined} from "util";
import {SafeJSON} from "../../common/json/safe-stringify";
import {persisted} from "../../providers/server/db-decorators";
import {PersistenceType} from "../../providers/server/db-types";

abstract class PersistableObject {
    @observable type: string;

    constructor() {
        this.type = this.constructor.name;
    }

    isEqual(obj: object): boolean {
        if (obj == null) {
            return false;
        }
        if (!(obj instanceof PersistableObject)) {
            return false;
        }
        return this.type == obj.type;
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

    isEqual(obj: object): boolean {
        if (!super.isEqual(obj)) {
            return false;
        }
        if (obj instanceof ObjectWithUUID) {
            return this._id == obj._id && this._rev == obj._rev;
        }
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
        let fields = [];
        // migrate properties to this
        if (state._id) {
            this._id = state['_id'];
            fields.push("_id");
        }
        if (state._rev) {
            this._rev = state['_rev'];
            fields.push("_rev");
        }
        this.is_new = false;
        return fields;
    }
}



/*
What if I throw away the DB entirely?
- I loose the 'change detection' thing (maybe I can keep it just for that)
    - could be replaced with watch.js, keeping the @persisted markers.
    - I need the @persisted markers to work out what to save.
    - So no, not reaaaaly easy to kill the DB off, since it arose mainly out of needing to know what to persist an object.
- I loose the ability to auto persist references / lists of references

ok. so a cache.

Want:
- DB reads go through the cache.
- DB writes hit DB then the cache.
- DB reference lookups use the cache first. If they have to construct, they add to the cache.
- Pouch updates the cache upon seeing changes.

Um, isn't that what the 'stores' are? Yes, sort of, but there are many.

So, stores:
- Is it possible to reduce all to a single store, keyed by type?
- So lookups CAN be by UUID, but there is lookup by type as well (easy enough if
the store can only track PersistableObjects, as these have a type).
- This way, we can use a single find_by_uuid.
- Can still have people(), teams(), etc getters, since we can query by type.

Downsides:
- All custom methods 'find-by-name, by-xxxx' are harder, cos not all objects have those.
Maybe remove them? Put them ... elsewhere? Perhaps have store.person.find_by_name, where person is a inner class, exposed... like a Manager in Django.
- Probably only scales to a few hundred thousand objects, perhaps less.  That's more a memory thing, wouldn't matter if you had many stores / one store.

 */



class BaseStore<T extends ObjectWithUUID> extends ObjectWithUUID {
    // organization DOESNT need persisted.
    // People DOES (but... it's not really managed by the DB directly)
    // So, Teams shouldn't be managed directly either?
    @persisted(PersistenceType.ReferenceList) items: Array<T>;
    // items: Array<T>;

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

function try_find_single_person_with(list, name: string, callback) {
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
    if (isUndefined(name) || name == null || name == "") {
        return null;
    }
    let person = try_find_single_person_with(list, name, obj => obj.name.toLocaleLowerCase() == name.toLocaleLowerCase());
    if (!person && fuzzy_match) {
        person = try_find_single_person_with(list, name, obj => obj.name.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()));
        if (!person) {
            // Try first word and first char of 2nd word
            let terms = name.split(' ');
            if (terms.length > 1) {
                let search = `${terms[0]} ${terms[1][0]}`.toLocaleLowerCase();
                // console.log(`Try ${search} for ${name}`);
                person = try_find_single_person_with(list, name, obj => obj.name.toLocaleLowerCase().startsWith(search));
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