import {BaseStore, find_object_with_name} from "./common/base_model";
import {observable} from "mobx";
import {Person} from "./people";

class Team extends BaseStore<Person> {
    @observable name: string;

    constructor(name: string, people: Array<Person> = []) {
        super();
        this.name = name;

        if (people) {
            this.add_objects_to_array(people);
        }
    }

    valueOf() {
        return this.name;
    }

    toString() {
        return this.valueOf();
    }

    find_person_with_name(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.items, name, fuzzy_match);
    }

    find_person_in_team(person: Person): Person {
        return this.find_by_uuid(person.uuid);
    }

    get_or_add_person(person: Person): Person {
        let found_person = this.find_person_in_team(person);
        if (!found_person) {
            return this.add_object_to_array(person);
        }
        return found_person;
    }

    add_person(person: Person): Person {
        return this.add_object_to_array(person);
    }
}


export {
    Team
}