import {observable} from "mobx-angular";
import {Person} from "./people";

export enum AvailabilityUnit {
    AVAIL_ANYTIME,
    AVAIL_DAYS,
    AVAIL_WEEKS,
}

export class Availability {
    period: number;
    unit: AvailabilityUnit;

    constructor(period: number = 1, unit: AvailabilityUnit = AvailabilityUnit.AVAIL_ANYTIME) {
        this.period = period;
        this.unit = unit;
    }

    get_end_date_from(date: Date) {
        let end_date = new Date(date);
        switch(this.unit) {
            case AvailabilityUnit.AVAIL_ANYTIME:
                end_date.setDate(date.getDate() + 1);
                break;

            case AvailabilityUnit.AVAIL_DAYS:
                end_date.setDate(date.getDate() + this.period);
                break;

            case AvailabilityUnit.AVAIL_WEEKS:
                end_date.setDate(date.getDate() + 7 * this.period);
                break;
        }
        return end_date;
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

