import {TypedObject} from "./common/base_model";
import {dayAndHourForDate} from "./common/date-utils";
import * as moment from "moment";
import {observable} from "mobx-angular";


class Unavailability extends TypedObject {
    @observable from_date: Date = null;
    @observable to_date: Date = null;
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

    matches_single_date(d: Date) {
        if (this.to_date != null) {
            return false;
        }
        let thisDate = dayAndHourForDate(this.from_date);
        let otherDate = dayAndHourForDate(d);
        return thisDate == otherDate;
    }

    contains_date(date: Date) {
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
            console.log("cos super !=");
            return false;
        }
        if (other_obj instanceof Unavailability) {
            if (!this.isDateEqual(this.from_date, other_obj.from_date)) {
                console.log("cos d1 !=");
                return false;
            }

            if (!this.isDateEqual(this.to_date, other_obj.to_date)) {
                console.log("cos d2 !=");
                return false;
            }
            let reasonEqual = this.reason == other_obj.reason;
            if (!reasonEqual) {
                console.log("cos reason !=");
            }
            return reasonEqual;
        }
        return false;
    }
}

export {Unavailability};
