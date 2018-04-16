import {action, computed, observable} from "mobx";
import {Role} from "./roles";
import {Availability, AvailabilityUnit, SchedulePrefs} from "./scheduling-types";
import {isUndefined} from "util";
import {AssignedToRoleCondition, ConditionalRule, Rule, WeightedRoles} from "../scheduling/rule_based/rules";
import {BaseStore, ObjectWithUUID} from "./common";
import {dayAndHourForDate, throwOnInvalidDate} from "../common/date-utils";
import {RuleFacts} from "../scheduling/rule_based/rule-facts";

import * as _ from "lodash";
import * as moment from "moment";

class Unavailablity extends ObjectWithUUID {
    from_date: Date = null;
    to_date: Date = null;
    reason: string = null;

    constructor(from: Date, to: Date = null, reason = null) {
        super();
        if (from == null) {
            throw new Error("From date cannot be null");
        }
        this.from_date = from;
        this.to_date = to;
        this.reason = reason;
    }

    get is_date_range(): boolean {
        return this.from_date != null && this.to_date != null;
    }

    matches_single_date(d: Date) {
        if (this.to_date != null) {
            return false;
        }
        let thisDate = dayAndHourForDate(this.from_date);
        let otherDate = dayAndHourForDate(d);
        return thisDate == otherDate;
    }

    contains_date(date: Date) {
        let start = moment(this.from_date).startOf('day');

        // By default, be one day in length
        let the_end_date = moment(this.from_date).endOf('day');

        if (this.is_date_range) {
            the_end_date = moment(this.to_date).endOf('day');
        }

        let date_as_moment = moment(date);
        // console.log("Test for " + date_as_moment + " being between " + start + " and " + the_end_date);
        return date_as_moment.isBetween(start, the_end_date, null, "[]");
    }
}

class Person extends ObjectWithUUID {
    public name: string;

    primary_roles: Map<Role, number>;
    @observable unavailable: Array<Unavailablity>;
    @observable prefs: SchedulePrefs;

    private condition_rules: Array<ConditionalRule>;

    // Need to store a role, and also for this person, if they are in this role what
    // other roles they can also fullfill. However; mobx doesn't like using objects as keys
    // in maps, which is a pain.
    // secondary_roles: Map<string, Array<Role>>;

    constructor(name: string) {
        super();
        this.name = name;
        this.primary_roles = new Map<Role, number>();
        this.condition_rules = [];
        this.unavailable = [];
        this.prefs = new SchedulePrefs();
    }

    get availability(): Availability {
        return this.prefs.availability;
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
        return this.set_availability(new Availability(a_number, unit));
    }

    @action
    set_availability(availability: Availability): Person {
        this.prefs.availability = availability;
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
    add_unavailable(d: Date, reason = null) {
        this.unavailable.push(new Unavailablity(d, null, reason));
    }

    add_unavailable_range(from: Date, to: Date, reason = null) {
        this.unavailable.push(new Unavailablity(from, to, reason));
    }

    remove_unavailable(d: Date) {
        this.unavailable = this.unavailable.filter(ud => {
            return !ud.matches_single_date(d);
        });
    }

    is_available(date: Date, facts: RuleFacts, record_unavailability: boolean = false) {
        // console.log("Testing availability with: " + this.availability.constructor.name);
        throwOnInvalidDate(date);
        return this.availability.is_available(this, date, facts, record_unavailability);
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

    get unavailable_by_date(): Array<Unavailablity> {
        return _.sortBy(this.unavailable, u => u.from_date);
    }

    valueOf() {
        return "[Person:" + this.name + "]";
    }
}

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
                throw new Error(`Searching for ${name} returns more than one person. Returns: ${JSON.stringify(all_people)}`);
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
    Person
}
