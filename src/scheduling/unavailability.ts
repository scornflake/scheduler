import {PersistableObject} from "./common/base_model";
import {dayAndHourForDate} from "./common/date-utils";
import * as moment from "moment";
import {persisted} from "../providers/server/db-decorators";


class Unavailablity extends PersistableObject {
    @persisted()
    from_date: Date = null;
    @persisted()
    to_date: Date = null;
    @persisted()
    reason: string = null;

    constructor(from: Date = null, to: Date = null, reason = null) {
        super();
        // if (from == null) {
        //     throw new Error("From date cannot be null");
        // }
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
}

export {Unavailablity};
