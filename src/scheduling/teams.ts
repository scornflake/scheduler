import {find_object_with_name, GenericObjectStore} from "./common/base_model";
import {Person} from "./people";
import {NamedObject} from "./common/scheduler-store";

class Team extends NamedObject {
    private _people: GenericObjectStore<Person>;

    constructor(name: string, people: Array<Person> = []) {
        super(name);

        this._people = new GenericObjectStore<Person>();

        if (people) {
            this._people.add_objects_to_array(people);
        }
    }

    get people(): Array<Person> {
        return NamedObject.sortByName(this._people.items);
    }

    set people(new_people: Array<Person>) {
        this._people.clear();
        this._people.add_objects_to_array(new_people);
    }

    findPersonWithName(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.people, name, fuzzy_match);
    }

    findPersonInTeam(person: Person): Person {
        return this._people.findByUUID(person.uuid);
    }

    findPersonByUUID(uuid: string): Person {
        return this._people.findByUUID(uuid);
    }

    getOrAddPerson(person: Person): Person {
        let found_person = this.findPersonInTeam(person);
        if (!found_person) {
            return this._people.add_object_to_array(person);
        }
        return found_person;
    }

    add(person: Person): Person {
        return this._people.add_object_to_array(person);
    }

    remove(person: Person) {
        this._people.remove_object_from_array(person);
    }
}


export {
    Team
}