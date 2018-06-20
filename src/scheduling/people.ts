import {Availability, AvailabilityUnit} from "./availability";
import {throwOnInvalidDate} from "./common/date-utils";
import {RuleFacts} from "./rule_based/rule-facts";

import {Unavailability} from "./unavailability";
import * as _ from "lodash";
import {observable} from "mobx-angular";
import {ObjectValidation} from "./shared";
import {ObjectUtils} from "../pages/page-utils";
import {NamedObject} from "./base-types";
import {Organization} from "./organization";

export class Person extends NamedObject {
    @observable email: string;
    @observable phone: string;
    @observable _availability: Availability;
    @observable unavailable: Array<Unavailability>;
    @observable organization: Organization;

    // Set when this user logs in
    serverId: number;

    constructor(name: string = "put name here", uuid: string = null) {
        super(name, uuid);
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

    addUnavailable(d: Date, reason = null): Unavailability {
        let unavailability = new Unavailability(d, null, reason);
        return this._add_unavail(unavailability);
    }

    addUnavailableRange(from: Date, to: Date, reason = null) {
        return this._add_unavail(new Unavailability(from, to, reason));
    }

    private _add_unavail(new_unavail: Unavailability) {
        if (this.unavailable.find(u => u.isEqual(new_unavail))) {
            return;
        }
        this.unavailable.push(new_unavail);
        return new_unavail;
    }

    removeUnavailable(u: Unavailability) {
        let idex = this.unavailable.indexOf(u);
        if (idex != -1) {
            this.unavailable.splice(idex, 1);
        }
    }

    is_available(date: Date, facts: RuleFacts, record_unavailability: boolean = false) {
        // console.log("Testing availability with: " + this.availability.constructor.name);
        throwOnInvalidDate(date);
        return this.availability.is_available(this, date, facts, record_unavailability);
    }

    isUnavailableOn(date: Date) {
        // See if this date is inside the unavailable date ranges
        // console.log(`unavail on : ${date} ?`);
        for (let unavail of this.unavailable) {
            // console.log(`  - check: ${unavail}`);
            if (unavail.containsDate(date)) {
                // console.log(` - date ${date} is contained in ${unavail}, returning TRUE`);
                return true;
            }
        }
        return false;
    }

    get unavailable_by_date(): Array<Unavailability> {
        return _.sortBy(this.unavailable, u => u.fromDate);
    }

    valueOf() {
        let idents = [];
        if (this.name) {
            idents.push(this.name);
        }
        if (this.email) {
            idents.push(this.email);
        }
        return idents.join(', ');
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


