import {observable} from "mobx-angular";
import {Role} from "./roles";
import {SchedulePrefs} from "./scheduling";

export class Person {
    @observable uuid: string;
    @observable name: string;
    @observable roles: Array<Role>;
    @observable unavailable: Array<Date>;
    @observable prefs: SchedulePrefs;

    constructor(uuid: string, name: string) {
        this.uuid = uuid;
        this.name = name;
        this.roles = [];
        this.unavailable = [];
        this.prefs = new SchedulePrefs();
    }

    addRole(r: Role) {
        this.roles.push(r);
    }

    removeRole(r: Role) {
        this.roles = this.roles.filter(role => {
            return role.uuid != r.uuid
        });
    }

    addUnavailable(d: Date) {
        this.unavailable.push(d);
    }

    removeUnavailable(d: Date) {
        this.unavailable = this.unavailable.filter(ud => {
            return ud.getTime() != d.getTime();
        });
    }
}

export class PeopleStore {
    @observable people: Array<Person>;

    constructor() {
        this.people = [];
    }

    addPerson(p: Person) {
        this.people.push(p);
    }

    removePerson(p: Person) {
        this.people = this.people.filter(per => {
            return per.uuid != p.uuid
        });
    }
}

