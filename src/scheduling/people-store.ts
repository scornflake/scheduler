import {BaseStore, find_object_with_name} from "./common/base_model";
import {action} from "mobx";
import {Person} from "./people";

export class PeopleStore extends BaseStore<Person> {
    constructor() {
        super();
    }

    @action
    add_person(p: Person): Person {
        return this.add_object_to_array(p);
    }

    @action
    remove_person(p: Person) {
        this.remove_object_from_array(p);
    }

    get people(): Array<Person> {
        return this.items;
    }

    find_person_with_name(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.people, name, fuzzy_match);
    }
}