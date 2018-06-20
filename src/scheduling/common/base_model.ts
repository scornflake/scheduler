import {observable} from "mobx-angular";
import * as _ from 'lodash';
import {isUndefined} from "util";
import {SafeJSON} from "../../common/json/safe-stringify";
import {ObjectWithUUID} from "../base-types";


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


TODO:
- Remove @persisted and replace with an explicit map.
- Add this map to the DB / store / somewhere, such that a test can modify it as well.

 */

class GenericObjectStore<T extends ObjectWithUUID> {
    @observable items: Array<T>;

    constructor() {
        this.items = [];
    }

    add_object_to_array(instance: T, overwrite_existing = true): T {
        if (!instance) {
            throw new Error(`Cannot add 'null' to this list. We are: ${this.constructor.name}s`)
        }
        let index = this.items.findIndex(o => o.uuid == instance.uuid);
        if (index != -1) {
            if (overwrite_existing) {
                this.items.splice(index, 1);
            } else {
                return null;
            }
        }
        this.items.push(instance);
        return instance;
    }

    add_objects_to_array(many_items: T[]) {
        if (many_items) {
            this.items.push(...many_items);
        }
    }

    remove_object_from_array(instance: T) {
        let index = this.findIndexOfObject(instance);
        if (index != -1) {
            this.items.splice(index, 1);
        }
    }

    protected clear_all_objects_from_array() {
        this.items = []
    }

    get length(): number {
        return this.items.length;
    }

    findByUUID(uuid: string): T {
        return this.items.find(v => v.uuid == uuid);
    }

    findIndexOfObject(obj: T): number {
        return this.items.findIndex(o => o.uuid == obj.uuid);
    }

    findIndex(predicate, fromIndex = 0) {
        return _.findIndex(this.items, predicate, fromIndex);
    }

    find(predicate) {
        return this.items.find(predicate);
    }

    clear() {
        this.items = [];
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
    GenericObjectStore,
    check_if_undefined,
    delete_from_array,
    find_object_with_name
}