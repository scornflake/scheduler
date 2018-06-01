import {Availability, AvailabilityUnit, SchedulePrefs} from "./availability";
import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {throwOnInvalidDate} from "./common/date-utils";
import {RuleFacts} from "./rule_based/rule-facts";

import {Unavailablity} from "./unavailability";
import * as _ from "lodash";
import {isUndefined} from "util";
import {SafeJSON} from "../common/json/safe-stringify";
import {action, observable} from "mobx";
import {ObjectValidation} from "./shared";

export class Person extends ObjectWithUUID {
    name: string;
    email: string;
    phone: string;

    @observable unavailable: Array<Unavailablity>;
    @observable prefs: SchedulePrefs;

    constructor(name: string = "put name here") {
        super();
        this.name = name;
        this.unavailable = [];
        this.prefs = new SchedulePrefs();
    }

    get availability(): Availability {
        return this.prefs.availability;
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

    get initials() {
        let words = this.name.split(" ");
        return words.map(w => w[0]).join(".")
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
        return this.name;
    }

    validate(): ObjectValidation {
        let validation = new ObjectValidation();
        if (!this.name) {
            validation.add_error("Name is required");
        }
        if (!this.email) {
            validation.add_error("Email is required");
        }
        return validation;
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


