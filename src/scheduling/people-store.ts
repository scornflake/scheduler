import {BaseStore} from "./common/base_model";
import {action} from "mobx";
import {SafeJSON} from "../common/json/safe-stringify";
import {isUndefined} from "util";
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

    try_find_single_person_with(callback) {
        let all_people = this.people.filter(callback);
        if (all_people.length) {
            if (all_people.length > 1) {
                throw new Error(`Searching for ${name} returns more than one person. Returns: ${SafeJSON.stringify(all_people)}`);
            }
            return all_people[0];
        }
        return null;
    }

    find_person_with_name(name: string, fuzzy_match: boolean = false) {
        if (isUndefined(name)) {
            return null;
        }
        let person = this.try_find_single_person_with(p => p.name.toLocaleLowerCase() == name.toLocaleLowerCase());
        if (!person && fuzzy_match) {
            person = this.try_find_single_person_with(p => p.name.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()));
            if (!person) {
                // Try first word and first char of 2nd word
                let terms = name.split(' ');
                if (terms.length > 1) {
                    let search = `${terms[0]} ${terms[1][0]}`.toLocaleLowerCase();
                    // console.log(`Try ${search} for ${name}`);
                    person = this.try_find_single_person_with(p => p.name.toLocaleLowerCase().startsWith(search));
                }
            }
        }
        return person;
    }
}