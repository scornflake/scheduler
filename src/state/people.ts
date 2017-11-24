import {observable} from "mobx-angular";
import {Role} from "./roles";
import {AvailabilityUnit, SchedulePrefs} from "./scheduling-types";
import includes from 'lodash/includes';
import ShortUniqueId from 'short-unique-id';

export class Person {
    @observable uuid: string;
    @observable name: string;
    @observable primary_roles: Array<Role>;
    @observable secondary_roles: Map<string, Array<Role>>;
    @observable unavailable: Array<Date>;
    @observable prefs: SchedulePrefs;

    // Need to store a role, and also for this person, if they are in this role what
    // other roles they can also fullfill. However; mobx doesn't like using objects as keys
    // in maps, which is a pain.
    //
    //

    constructor(name: string, uuid: string = null) {
        if (uuid == null) {
            let uuid_gen = new ShortUniqueId();
            uuid = uuid_gen.randomUUID(8);
        }
        this.uuid = uuid;
        this.name = name;
        this.primary_roles = [];
        this.secondary_roles = new Map<string, Array<Role>>();
        this.unavailable = [];
        this.prefs = new SchedulePrefs();
    }

    get roles():Array<Role> {
        return this.primary_roles;
    }

    get highest_role_layout_priority(): number {
        return this.roles.reduce((previousMax, role) => {
            return Math.max(previousMax, role.layout_priority);
        }, 0);
    }

    avail_every(a_number: number, unit: AvailabilityUnit): Person {
        this.prefs.availability.every(a_number, unit);
        return this;
    }

    with_dep_role(role:Role, other_roles:Array<Role>): Person {
        this.addRole(role);
        this.secondary_roles.set(role.uuid, other_roles);
        return this;
    }

    with_roles(roles: Array<Role>): Person {
        for (let role of roles) {
            this.addRole(role);
        }
        return this;
    }

    has_primary_role(role: Role) {
        let matching_roles = this.roles.filter(r => {
            return r.uuid == role.uuid;
        });
        return matching_roles.length > 0;
    }

    addRole(r: Role) {
        if (includes(this.roles, r)) {
            return;
        }
        this.roles.push(r);
    }

    removeRole(r: Role) {
        this.primary_roles = this.roles.filter(role => {
            return role.uuid != r.uuid;
        });
        this.secondary_roles.delete(r.uuid);
    }

    addUnavailable(d: Date) {
        this.unavailable.push(d);
    }

    removeUnavailable(d: Date) {
        this.unavailable = this.unavailable.filter(ud => {
            return ud.getTime() != d.getTime();
        });
    }

    is_unavailable_on(date: Date) {
        // See if this date is inside the unavailable date ranges
        for (let start_date of this.unavailable) {
            let end_date = new Date(start_date);
            end_date.setDate(start_date.getDate() + 1);

            if (date >= start_date && date < end_date) {
                return true;
            }
        }
        return false;
    }
}

export class PeopleStore {
    @observable people: Array<Person>;

    constructor() {
        this.people = [];
    }

    addPerson(p: Person): Person {
        this.people.push(p);
        return p;
    }

    removePerson(p: Person) {
        this.people = this.people.filter(per => {
            return per.uuid != p.uuid
        });
    }

    people_with_role(role: Role) {
        return this.people.filter(person => {
            for (let person_role of person.roles) {
                if (role.uuid == person_role.uuid) {
                    return true;
                }
            }
            return false;
        });
    }
}

