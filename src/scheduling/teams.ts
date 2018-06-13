import {find_object_with_name} from "./common/base_model";
import {Person} from "./people";
import {NamedObject} from "./common/scheduler-store";
import {action, observable} from "mobx-angular";

class Team extends NamedObject {
    private _people: Array<Person>;

    constructor(name: string, people: Array<Person> = []) {
        super(name);
        this._people = observable(new Array<Person>());
        if (people) {
            this.people = people;
        }
    }

    get people(): Array<Person> {
        return NamedObject.sortByName(this._people);
    }

    set people(new_people: Array<Person>) {
        if(new_people) {
            this._people.splice(0, this._people.length);
            new_people.forEach(v => this._people.push(v));
        }
    }

    findPersonWithName(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.people, name, fuzzy_match);
    }

    findPersonInTeam(person: Person): Person {
        return this.findPersonByUUID(person.uuid);
    }

    findPersonByUUID(uuid: string): Person {
        return this._people.find(v => v.uuid == uuid);
    }

    @action
    getOrAddPerson(person: Person): Person {
        let found_person = this.findPersonInTeam(person);
        if (!found_person) {
            return this.add(person);
        }
        return found_person;
    }

    @action
    add(person: Person): Person {
        if(person) {
            let existing = this.findPersonByUUID(person.uuid);
            if (!existing) {
                this._people.push(person);
            }
        }
        return person;
    }

    @action
    remove(person: Person) {
        if(person) {
            let index = this._people.findIndex(p => p.uuid == person.uuid);
            if (index != -1) {
                this._people.splice(index, 1);
            }
        }
    }
}


export {
    Team
}