import {observable} from "mobx-angular";
import {Person} from "./people";
import {Role} from "./roles";

export enum AvailabilityUnit {
    AVAIL_ANYTIME,
    EVERY_N_DAYS,
    EVERY_N_WEEKS,
}

export class Availability {
    period: number;
    unit: AvailabilityUnit;
    only_to_role: Role;

    constructor(period: number = 1, unit: AvailabilityUnit = AvailabilityUnit.AVAIL_ANYTIME, only_to_role: Role = null) {
        this.period = period;
        this.unit = unit;
        this.only_to_role = only_to_role;
    }

    get_end_date_from(date: Date) {
        let end_date = new Date(date);
        switch (this.unit) {
            case AvailabilityUnit.AVAIL_ANYTIME:
                end_date.setDate(date.getDate() + 1);
                break;

            case AvailabilityUnit.EVERY_N_DAYS:
                end_date.setDate(date.getDate() + this.period - 1);
                break;

            case AvailabilityUnit.EVERY_N_WEEKS:
                end_date.setDate(date.getDate() + (7 * this.period) - 1);
                break;
        }
        return end_date;
    }

    every(a_number: number, unit: AvailabilityUnit) {
        this.period = a_number;
        this.unit = unit;
    }
}

export class SchedulePrefs {
    @observable slip_aggressiveness: number;
    @observable fill_aggresiveness: number;
    @observable preferred_leader: Person;
    @observable availability: Availability;

    constructor() {
        this.slip_aggressiveness = 0;
        this.fill_aggresiveness = 0;
        this.availability = new Availability();
    }
}

