import {Person} from "./people";
import {throwOnInvalidDate} from "./common/date-utils";
import {RuleFacts} from "./rule_based/rule-facts";
import {Logger} from "ionic-logging-service";
import {LoggingWrapper} from "../common/logging-wrapper";
import {ObjectWithUUID, TypedObject} from "./common/base_model";
import {observable} from "mobx-angular";

export enum AvailabilityUnit {
    // Models availability such as "every 4 weeks".
    // Use Availability
    AVAIL_ANYTIME = 'anytime',
    EVERY_N_DAYS = 'every_days',
    EVERY_N_WEEKS = 'every_weeks',

    // Models availability such as "every 2 out of 3"
    // Use AvailabilityEveryNOfM
    EVERY_N_OF_M_WEEKS = 'every_n_of_m',
}

export class Availability extends ObjectWithUUID {
    @observable period: number;
    @observable unit: AvailabilityUnit;

    protected logger: Logger;

    constructor(period: number = 1, unit: AvailabilityUnit = AvailabilityUnit.AVAIL_ANYTIME) {
        super();
        this.period = period;
        this.unit = unit;
        this.logger = LoggingWrapper.getLogger("scheduler.availability");
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

    static StringForUnit(unit: AvailabilityUnit) {
        switch (unit) {
            case AvailabilityUnit.EVERY_N_WEEKS:
                return "Every N weeks";
            case AvailabilityUnit.EVERY_N_DAYS:
                return "Every N days";
            case AvailabilityUnit.AVAIL_ANYTIME:
                return "Anytime";
            case AvailabilityUnit.EVERY_N_OF_M_WEEKS:
                return "Every N of M";
        }
    }

    public unit_description(singular: boolean): string {
        switch (this.unit) {
            case AvailabilityUnit.EVERY_N_WEEKS:
                return singular ? "week" : "weeks";
            case AvailabilityUnit.EVERY_N_DAYS:
                return singular ? "day" : "days";
        }
        return "";
    }

    public toString(): string {
        return this.description();
    }

    public description(short: boolean = false) {
        if (this.unit == AvailabilityUnit.AVAIL_ANYTIME) {
            return "anytime";
        }
        if (this.period == 1) {
            return `${!short ? 'Every ' : ''}${this.period} ${this.unit_description(true)}`
        }
        return `${!short ? 'Every ' : ""}${this.period} ${this.unit_description(false)}`
    }

    isEqual(obj: object): boolean {
        if (!super.isEqual(obj)) {
            return false;
        }
        if (obj instanceof Availability) {
            return this.unit == obj.unit &&
                this.period == obj.period;
        }
    }

}

export class AvailabilityEveryNOfM extends Availability {
    @observable period_to_look_at: number;

    constructor(every: number = 1, of_weeks: number = 1) {
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
        let is_available = num_placements < this.period;

        this.logger.info(`${person.name} is available: ${is_available}. ${num_placements} < ${this.period}`);

        if (record_unavailability) {
            facts.add_decision(`Looking between ${start_date.toDateString()} and ${end_date.toDateString()}. Have ${num_placements} in those dates`);
            let rule = `Rule is every ${this.period} of ${this.period_to_look_at}`;
            if (is_available) {
                facts.add_decision(` - Available. ${rule}. Would cause ${num_placements + 1} out of ${this.period_to_look_at}`);
            } else {
                facts.add_decision(` - Unavailable. ${rule}. Would cause ${num_placements + 1} out of ${this.period_to_look_at}`);
            }
        }
        return is_available;
    }

    isEqual(obj: object): boolean {
        if (!super.isEqual(obj)) {
            return false;
        }
        if (obj instanceof AvailabilityEveryNOfM) {
            return this.period_to_look_at == obj.period_to_look_at;
        }
    }

    public toString(): string {
        return `Every ${this.period} in ${this.period_to_look_at} weeks`;
    }
}

