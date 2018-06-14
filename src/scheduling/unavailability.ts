import {TypedObject} from "./base-types";
import {dayAndHourForDate} from "./common/date-utils";
import * as moment from "moment";
import {observable} from "mobx-angular";

class Unavailability extends TypedObject {
    @observable _from_date: Date = null;
    @observable _to_date: Date = null;
    @observable reason: string = null;

    constructor(from: Date = null, to: Date = null, reason = null) {
        super();
        this.from_date = from;
        this.to_date = to;
        this.reason = reason;
    }

    get is_date_range(): boolean {
        return this.from_date != null && this.to_date != null;
    }

    get to_date() {
        return this._to_date;
    }

    set to_date(new_value: any) {
        if (typeof new_value === 'string') {
            new_value = moment(new_value).toDate();
        }
        this._to_date = new_value;
    }

    get from_date() {
        return this._from_date;
    }

    set from_date(new_value: any) {
        if (typeof new_value === 'string') {
            new_value = moment(new_value).toDate();
        }
        this._from_date = new_value;
    }

    matches_single_date(d: Date) {
        if (this.to_date != null) {
            return false;
        }
        let thisDate = dayAndHourForDate(this.from_date);
        let otherDate = dayAndHourForDate(d);
        return thisDate == otherDate;
    }

    contains_date(date: Date) {
        if (date == null) {
            return false;
        }
        let start = moment(this.from_date).startOf('day');

        // By default, be one day in length
        let the_end_date = moment(this.from_date).endOf('day');

        if (this.is_date_range) {
            the_end_date = moment(this.to_date).endOf('day');
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
            if (!this.isDateEqual(this.from_date, other_obj.from_date)) {
                // console.log("cos d1 !=");
                return false;
            }

            if (!this.isDateEqual(this.to_date, other_obj.to_date)) {
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
        if(this.is_date_range) {
            return `from ${this.from_date} -> ${this.to_date}`;
        }
        return `on ${this.from_date}`;
    }
}

export {Unavailability};
