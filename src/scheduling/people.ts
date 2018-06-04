import {Availability, AvailabilityUnit} from "./availability";
import {ObjectWithUUID} from "./common/base_model";
import {throwOnInvalidDate} from "./common/date-utils";
import {RuleFacts} from "./rule_based/rule-facts";

import {Unavailablity} from "./unavailability";
import * as _ from "lodash";
import {action, observable} from "mobx";
import {ObjectValidation} from "./shared";
import {PersistenceType} from "../providers/server/db-types";
import {persisted} from "../providers/server/db-decorators";

export class Person extends ObjectWithUUID {
    @persisted()
    name: string;
    @persisted()
    email: string;
    @persisted()
    phone: string;

    @observable @persisted(PersistenceType.NestedObject)
    availability: Availability;

    @observable @persisted(PersistenceType.NestedObjectList)
    unavailable: Array<Unavailablity>;

    constructor(name: string = "put name here") {
        super();
        this.name = name;
        this.unavailable = [];
        this.availability = new Availability();
    }

    static sort_by_name(list: Array<Person>): Array<Person> {
        return list.sort(((a, b) => {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        }));
    }

    @action
    avail_every(a_number: number, unit: AvailabilityUnit): Person {
        this.availability = new Availability(a_number, unit);
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


