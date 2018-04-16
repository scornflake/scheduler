import {observable} from "mobx";
import {Person} from "./people";
import {throwOnInvalidDate} from "../common/date-utils";
import {RuleFacts} from "../scheduling/rule_based/rule-facts";

export enum AvailabilityUnit {
    // Models availability such as "every 4 weeks".
    // Use Availability
    AVAIL_ANYTIME,
    EVERY_N_DAYS,
    EVERY_N_WEEKS,

    // Models availability such as "every 2 out of 3"
    // Use AvailabilityEveryNOfM
    EVERY_N_OF_M_WEEKS,
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

    is_available(person: Person, date: Date, facts: RuleFacts, record_unavailability: boolean) {
        return true;
    }
}

export class AvailabilityEveryNOfM extends Availability {
    period_to_look_at: number;

    constructor(every: number, of_weeks: number) {
        super(every, AvailabilityUnit.EVERY_N_OF_M_WEEKS);
        this.period_to_look_at = of_weeks;
    }

    // Always returns one week.
    get_end_date_from(date: Date): Date {
        let end_date = new Date(date);
        end_date.setDate(date.getDate() + (7) - 1);
        return end_date;
    }

    is_available(person: Person, date: Date, facts: RuleFacts, record_unavailability: boolean) {
        // How many times have I done something .... in the last 'M' weeks?
        throwOnInvalidDate(date);
        let end_date = new Date(date);
        let start_date = new Date(date);
        start_date.setDate(date.getDate() - (this.period_to_look_at * 7) + 1);

        if (record_unavailability) {
            // facts.add_decision("Checking from " + start_date.toDateString() + " to " + end_date.toDateString());
        }

        // Count the number of times this person has done something
        let number_of_placements = facts.placements_for_person(person, start_date, end_date);
        let num_placements = number_of_placements.length;
        let is_available = num_placements <= this.period;
        if (is_available && record_unavailability) {
            facts.add_decision(" - Unavailable. Rule is every " + num_placements + " out of " + this.period_to_look_at + ". Would cause" + num_placements + " out of " + this.period);
        }
        return is_available;
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

