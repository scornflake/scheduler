import {Availability, AvailabilityUnit} from "./availability";
import {throwOnInvalidDate} from "./common/date-utils";
import {AccumulatedFacts} from "./rule_based/accumulated-facts";

import {Unavailability} from "./unavailability";
import * as _ from "lodash";
import {ObjectValidation} from "./shared";
import {ObjectUtils} from "../pages/page-utils";
import {NamedObject, ObjectWithUUID, TypedObject} from "./base-types";
import {Organization} from "./organization";
import {action, computed, observable, runInAction} from "mobx";
import {Plan} from "./plan";
import {UserResponse} from "../common/interfaces";

class Preferences extends ObjectWithUUID {
    @observable previous_sheet_id: string;
    @observable previous_sheet_tab_id: number;
    @observable google_sheet_id: string;
    @observable google_sheet_tab_id: number;
    @observable google_sheet_id_retrieved: boolean;
    @observable selected_plan_uuid: string;

    @observable last_selected_date;

    constructor(uuid: string = null) {
        super(uuid);
    }

    @computed get have_previous_selection(): boolean {
        return this.previous_sheet_id != null && this.previous_sheet_tab_id != 0;
    }

    @action clear_previous_sheet_selection() {
        this.previous_sheet_id = null;
        this.previous_sheet_tab_id = 0;
    }

    @action clear_all_sheet_state() {
        this.google_sheet_id = "";
        this.google_sheet_tab_id = 0;
        this.google_sheet_id_retrieved = false;
        this.clear_previous_sheet_selection();
    }

    @action setSelectedPlan(plan: Plan) {
        if (plan) {
            this.selected_plan_uuid = plan.uuid;
        } else {
            this.selected_plan_uuid = "";
        }
    }

    @action setSelectedPlanUUID(value: string) {
        if (value != this.selected_plan_uuid) {
            this.selected_plan_uuid = value;
        }
    }

    @action setSheetToExportTo(spreadsheetId: any, sheetId: number) {
        this.google_sheet_id = spreadsheetId;
        this.google_sheet_tab_id = sheetId;
    }

    @action clearSelectedSheet() {
        this.google_sheet_id = null;
        this.google_sheet_tab_id = null;
    }
}

class Invitation extends TypedObject {
    @observable from: string;
    @observable fromEmail: string;
    @observable organizationName: string;
    @observable organizationUUID: string;
    @observable date: Date;
}

class Person extends NamedObject {
    @observable email: string;
    @observable phone: string;
    @observable _availability: Availability;
    @observable unavailable: Array<Unavailability>;
    @observable organization: Organization;
    @observable invites: Array<Invitation>;
    @observable preferences: Preferences;

    // Set when this user logs in
    serverId: number;

    constructor(name: string = "put name here", uuid: string = null) {
        super(name, uuid);
        this.unavailable = [];
        this.preferences = new Preferences();
        this.availability = new Availability();
        // noinspection JSPrimitiveTypeWrapperUsage
        this.invites = new Array<Invitation>();
    }

    @action
    static createFromUserResponse(lr: UserResponse) {
        let p = new Person();
        let name_parts = [];
        if (lr.first_name) name_parts.push(lr.first_name);
        if (lr.last_name) name_parts.push(lr.last_name);
        p.name = name_parts.join(" ");
        p.email = lr.email;
        return p;
    }

    @action removeInvitesMatching(invite) {
        let matching = this.invites.filter(i => i.fromEmail = invite.fromEmail);
        for(let invite of matching) {
            let index = this.invites.indexOf(invite);
            if(index != -1) {
                this.invites.splice(index, 1);
            }
        }
    }

    @action avail_every(a_number: number, unit: AvailabilityUnit): Person {
        this.availability = new Availability(a_number, unit);
        return this;
    }

    @computed get availability() {
        return this._availability;
    }

    @action setEmail(email: string) {
        this.email = email;
    }

    @action setPhone(phone: string) {
        this.phone = phone;
    }

    set availability(new_value: Availability) {
        if (ObjectUtils.deep_equal(this._availability, new_value)) {
            // console.log(`Not setting availability for ${this.name} to ${new_value}. It's the same as existing value: ${this._availability}`);
            return;
        }
        // console.debug(`Setting availability for ${this.name} to ${new_value}`);
        runInAction(() => {
            this._availability = new_value;
        })
    }

    @computed get initials() {
        if (this.name != null) {
            let words = this.name.split(" ");
            return words.map(w => w[0]).join(".")
        }
        return "";
    }

    @computed get firstName() {
        if (this.name != null) {
            let words = this.name.split(" ");
            if(words.length > 0) {
                return words[0];
            }
        }
        return this.name;
    }

    @action addUnavailable(d: Date, reason = null): Unavailability {
        let unavailability = new Unavailability(d, null, reason);
        return this._add_unavail(unavailability);
    }

    @action addUnavailableRange(from: Date, to: Date, reason = null) {
        return this._add_unavail(new Unavailability(from, to, reason));
    }

    private _add_unavail(new_unavail: Unavailability) {
        if (this.unavailable.find(u => u.isEqual(new_unavail))) {
            return;
        }
        this.unavailable.push(new_unavail);
        return new_unavail;
    }

    @action removeUnavailable(u: Unavailability) {
        let idex = this.unavailable.indexOf(u);
        if (idex != -1) {
            this.unavailable.splice(idex, 1);
        }
    }

    is_available(date: Date, facts: AccumulatedFacts, record_unavailability: boolean = false) {
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

    @computed get unavailable_by_date(): Array<Unavailability> {
        return _.sortBy(this.unavailable, u => u.fromDate);
    }

    valueOf() {
        let idents = [];
        if (this != null) {
            if (this.name != null) {
                idents.push(this.name);
            }
            if (this.email != null) {
                idents.push(this.email);
            }
        }
        return idents.join(', ');
    }

    validate(): ObjectValidation {
        let validation = new ObjectValidation();
        if (!this.name) {
            validation.addError("Name is required");
        }
        if (!this.email) {
            validation.addError("Email is required");
        }
        return validation;
    }
}


export {
    Person,
    Preferences,
    Invitation
};