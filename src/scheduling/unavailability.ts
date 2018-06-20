import {TypedObject} from "./base-types";
import {dayAndHourForDate} from "./common/date-utils";
import * as moment from "moment";
import {observable} from "mobx-angular";

import Moment from "moment";
import {extendMoment} from 'moment-range';

class Unavailability extends TypedObject {
    @observable _fromDate: Date = null;
    @observable _toDate: Date = null;
    @observable reason: string = null;

    constructor(from: Date = null, to: Date = null, reason = null) {
        super();
        this.fromDate = from;
        this.toDate = to;
        this.reason = reason;
    }

    get isDateRange(): boolean {
        return this.fromDate != null && this.toDate != null;
    }

    get dateRange(): Date[] {
        if (!this.isDateRange) {
            return [this.fromDate];
        }
        const moment = extendMoment(Moment);
        let moments = moment.range(this.fromDate, this.toDate).by('days');
        return Array.from(moments).map(m => m.toDate());
    }

    get toDate() {
        return this._toDate;
    }

    set toDate(new_value: any) {
        if (typeof new_value === 'string') {
            new_value = moment(new_value).toDate();
        }
        this._toDate = new_value;
    }

    get fromDate() {
        return this._fromDate;
    }

    set fromDate(new_value: any) {
        if (typeof new_value === 'string') {
            new_value = moment(new_value).toDate();
        }
        this._fromDate = new_value;
    }

    matchesSingleDate(d: Date) {
        if (this.toDate != null) {
            return false;
        }
        let thisDate = dayAndHourForDate(this.fromDate);
        let otherDate = dayAndHourForDate(d);
        return thisDate == otherDate;
    }

    containsDate(date: Date) {
        if (date == null) {
            return false;
        }
        let start = moment(this.fromDate).startOf('day');

        // By default, be one day in length
        let the_end_date = moment(this.fromDate).endOf('day');

        if (this.isDateRange) {
            the_end_date = moment(this.toDate).endOf('day');
        }

        let date_as_moment = moment(date);
        // console.log("Test for " + date_as_moment + " being between " + start + " and " + the_end_date);
        return date_as_moment.isBetween(start, the_end_date, null, "[]");
    }

    isDateEqual(date_one: Date, date_two: Date) {
        if (date_two == date_one) {
            return true;
        }
        if (date_one == null && date_two != null) {
            return false;
        }
        if (date_one != null && date_two == null) {
            return false;
        }
        return date_one.getTime() == date_two.getTime();
    }

    isEqual(other_obj: object): boolean {
        if (!super.isEqual(other_obj)) {
            // console.log("cos super !=");
            return false;
        }
        if (other_obj instanceof Unavailability) {
            if (!this.isDateEqual(this.fromDate, other_obj.fromDate)) {
                // console.log("cos d1 !=");
                return false;
            }

            if (!this.isDateEqual(this.toDate, other_obj.toDate)) {
                // console.log("cos d2 !=");
                return false;
            }
            let reasonEqual = this.reason == other_obj.reason;
            if (!reasonEqual) {
                // console.log("cos reason !=");
            }
            return reasonEqual;
        }
        return false;
    }

    toString() {
        if (this.isDateRange) {
            return `from ${this.fromDate} -> ${this.toDate}`;
        }
        return `on ${this.fromDate}`;
    }
}

export {Unavailability};
