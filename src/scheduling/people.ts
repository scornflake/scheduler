import {Availability, AvailabilityUnit} from "./availability";
import {throwOnInvalidDate} from "./common/date-utils";
import {RuleFacts} from "./rule_based/rule-facts";

import {Unavailability} from "./unavailability";
import * as _ from "lodash";
import {observable} from "mobx-angular";
import {ObjectValidation} from "./shared";
import {ObjectUtils} from "../pages/page-utils";
import {NamedObject} from "./base-types";

export class Person extends NamedObject {
    @observable email: string;
    @observable phone: string;

    @observable _availability: Availability;
    @observable unavailable: Array<Unavailability>;

    constructor(name: string = "put name here") {
        super(name);
        this.unavailable = [];
        this.availability = new Availability();
    }

    avail_every(a_number: number, unit: AvailabilityUnit): Person {
        this.availability = new Availability(a_number, unit);
        return this;
    }

    get availability() {
        return this._availability;
    }

    set availability(new_value: Availability) {
        if (ObjectUtils.deep_equal(this._availability, new_value)) {
            // console.log(`Not setting availability for ${this.name} to ${new_value}. It's the same as existing value: ${this._availability}`);
            return;
        }
        // console.debug(`Setting availability for ${this.name} to ${new_value}`);
        this._availability = new_value;
    }

    get initials() {
        let words = this.name.split(" ");
        return words.map(w => w[0]).join(".")
    }

    add_unavailable(d: Date, reason = null) {
        let new_unavail = new Unavailability(d, null, reason);
        this._add_unavail(new_unavail);
    }

    add_unavailable_range(from: Date, to: Date, reason = null) {
        let unavailablity = new Unavailability(from, to, reason);
        this._add_unavail(unavailablity);
    }

    private _add_unavail(new_unavail: Unavailability) {
        if (this.unavailable.find(u => u.isEqual(new_unavail))) {
            return;
        }
        this.unavailable.push(new_unavail);
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
        // console.log(`unavail on : ${date} ?`);
        for (let unavail of this.unavailable) {
            // console.log(`  - check: ${unavail}`);
            if (unavail.contains_date(date)) {
                // console.log(` - date ${date} is contained in ${unavail}, returning TRUE`);
                return true;
            }
        }
        return false;
    }

    get unavailable_by_date(): Array<Unavailability> {
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


