import {action, computed, observable} from "mobx-angular";
import {Role} from "./roles";
import {AvailabilityUnit, SchedulePrefs} from "./scheduling-types";
import ShortUniqueId from 'short-unique-id';
import {isUndefined} from "util";
import {
    AssignedToRoleCondition, ConditionalRule, Rule,
    WeightedRoles
} from "../scheduling/rule_based/rules";
import * as _ from "lodash";

class Unavailablity {
    from_date: Date = null;
    to_date: Date = null;

    constructor(from: Date, to: Date = null) {
        if (from == null) {
            throw new Error("From date cannot be null");
        }
        this.from_date = from;
        this.to_date = to;
    }

    public static dayAndHourForDate(date: Date): string {
        return date.getFullYear() + "/" + date.getMonth() + "/" + date.getDate() + "@" + date.getHours();
    }

    get is_date_range(): boolean {
        return this.from_date != null && this.to_date != null;
    }

    matches_single_date(d: Date) {
        if (this.to_date != null) {
            return false;
        }
        let thisDate = Unavailablity.dayAndHourForDate(this.from_date);
        let otherDate = Unavailablity.dayAndHourForDate(d);
        return thisDate == otherDate;
    }

    contains_date(date: Date) {
        let start = this.from_date;

        // By default, be one day in length
        let the_end_date = new Date(start);
        the_end_date.setDate(start.getDate() + 1);

        if (this.is_date_range) {
            the_end_date = this.to_date;
        }
        return date >= start && date < the_end_date;
    }
}

class Person {
    private _name: string;

    @observable uuid: string;

    @computed
    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
        // console.log("Set name to " + value);
    }

    primary_roles: Map<Role, number>;
    @observable unavailable: Array<Unavailablity>;
    @observable prefs: SchedulePrefs;

    private condition_rules: Array<ConditionalRule>;

    // Need to store a role, and also for this person, if they are in this role what
    // other roles they can also fullfill. However; mobx doesn't like using objects as keys
    // in maps, which is a pain.
    // secondary_roles: Map<string, Array<Role>>;

    constructor(name: string, uuid: string = null) {
        if (uuid == null) {
            let uuid_gen = new ShortUniqueId();
            uuid = uuid_gen.randomUUID(8);
        }
        this._name = name;
        this.uuid = uuid;
        this.primary_roles = new Map<Role, number>();
        this.condition_rules = [];
        this.unavailable = [];
        this.prefs = new SchedulePrefs();
    }

    role_rules(): Array<Rule> {
        let rules = [];

        // TODO: Hmm. Could add unavailability dates as rules?
        // Have a rule that returns NO roles if the person is unavailable.
        // Could do that on the Pick as well. Here might be a little cleaner, model wise.

        // Add in weighted role distribution
        let weighting = new WeightedRoles(this.primary_roles);
        rules.push(weighting);

        return rules;
    }

    @computed
    get roles(): Array<Role> {
        return Array.from(this.primary_roles.keys());
    }

    @computed
    get highest_role_layout_priority(): number {
        return this.roles.reduce((previousMax, role) => {
            return Math.max(previousMax, role.layout_priority);
        }, 0);
    }

    @action
    avail_every(a_number: number, unit: AvailabilityUnit): Person {
        this.prefs.availability.every(a_number, unit);
        return this;
    }

    get max_role_layout_priority(): number {
        return this.roles.reduce((prev, role) => {
            return Math.max(prev, role.layout_priority);
        }, 0);
    }

    get conditional_rules(): Array<ConditionalRule> {
        return this.condition_rules;
    }

    if_assigned_to(role: Role): ConditionalRule {
        this.add_role(role);

        let roleRule = new AssignedToRoleCondition(role);
        this.condition_rules.push(roleRule);
        return roleRule;
    }

    has_primary_role(role: Role) {
        let matching_roles = this.roles.filter(r => {
            return r.uuid == role.uuid;
        });
        return matching_roles.length > 0;
    }

    @action
    add_role(r: Role, weighting = 1): Person {
        if (r == null || isUndefined(r)) {
            throw Error("Cannot add a nil or undefined role");
        }
        this.primary_roles.set(r, weighting);
        return this;
    }

    @action
    remove_role(r: Role): Person {
        this.primary_roles.delete(r);
        return this;
    }

    @action
    add_unavailable(d: Date) {
        this.unavailable.push(new Unavailablity(d));
    }

    add_unavailable_range(from: Date, to: Date) {
        this.unavailable.push(new Unavailablity(from, to));
    }

    remove_unavailable(d: Date) {
        this.unavailable = this.unavailable.filter(ud => {
            return !ud.matches_single_date(d);
        });
    }

    is_unavailable_on(date: Date) {
        // See if this date is inside the unavailable date ranges
        for (let unavail of this.unavailable) {
            if (unavail.contains_date(date)) {
                return true;
            }
        }
        return false;
    }

    get unavailable_by_date() : Array<Unavailablity> {
        return _.sortBy(this.unavailable, u => u.from_date);
    }

    valueOf() {
        return "[Person:" + this.name + "]";
    }
}

class PeopleStore {
    @observable people: Array<Person>;

    constructor() {
        this.people = [];
    }

    @action
    add_person(p: Person): Person {
        this.people.push(p);
        return p;
    }

    @action
    remove_person(p: Person) {
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

    get roles_for_all_people(): Array<Role> {
        let all_roles = _.flatMap(this.people, (p) => p.roles);
        return _.uniqBy(all_roles, (r) => r.uuid);
    }

    order_people_by_role_layout_priority() {
        return this.people.sort((p1: Person, p2: Person) => {
            let maxlp1 = p1.max_role_layout_priority;
            let maxlp2 = p2.max_role_layout_priority;
            return maxlp1 < maxlp2 ? 1 : maxlp1 > maxlp2 ? -1 : 0;
        });
    }
}


export {
    Unavailablity,
    PeopleStore,
    Person
}