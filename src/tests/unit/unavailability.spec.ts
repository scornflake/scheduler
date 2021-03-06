import {dayAndHourForDate, parseDateFromSpreadsheetDate} from "../../scheduling/common/date-utils";
import {Unavailability} from "../../scheduling/unavailability";

describe('unavailability', () => {
    it('can parse dates', () => {
        let dateString = "Sun May 27 2018";
        let js_date = parseDateFromSpreadsheetDate(dateString);
        // console.log(`Got: ${SafeJSON.stringify(js_date)}`);
        expect(js_date.getMonth()).toEqual(4);
        expect(js_date.getFullYear()).toEqual(2018);
        expect(js_date.getDate()).toEqual(27);
    });

    it('can parse null date and get null', function () {
        expect(parseDateFromSpreadsheetDate(null)).toBeNull();
    });

    it('equality sanity', function () {
        let unavil = new Unavailability(new Date(2010, 10, 1));
        expect(unavil.isEqual(unavil)).toBeTruthy();
    });

    it('can model single date', () => {
        let unavil = new Unavailability(new Date(2010, 10, 1));
        expect(unavil.matchesSingleDate(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.matchesSingleDate(new Date(2010, 11, 1))).toBeFalsy();
        expect(unavil.matchesSingleDate(new Date(2009, 10, 1))).toBeFalsy();
    });

    it('takes into account hours', () => {
        let unavil = new Unavailability(new Date(2010, 10, 1, 10));
        expect(unavil.matchesSingleDate(new Date(2010, 10, 1, 10))).toBeTruthy();
        expect(unavil.matchesSingleDate(new Date(2010, 10, 1, 10, 20))).toBeTruthy();
        expect(unavil.matchesSingleDate(new Date(2010, 10, 1, 11, 20))).toBeFalsy();
    });

    it('can check for date being "in" a day', () => {
        let unavil = new Unavailability(new Date(2010, 10, 1));
        expect(unavil.containsDate(new Date(2010, 10, 1, 10))).toBeTruthy();

        expect(unavil.containsDate(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.containsDate(new Date(2010, 10, 0))).toBeFalsy();
        expect(unavil.containsDate(new Date(2010, 10, 2))).toBeFalsy();
    });

    it('can model a date range', () => {
        let from_date = new Date(2010, 10, 1);
        let to_date = new Date(2010, 11, 2);
        let unavil = new Unavailability(from_date, to_date);

        expect(unavil.fromDate).toEqual(from_date);
        expect(unavil.toDate).toEqual(to_date);

        expect(unavil.containsDate(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.containsDate(new Date(2010, 10, 1, 10))).toBeTruthy();
        expect(unavil.containsDate(new Date(2010, 11, 1))).toBeTruthy();

        expect(unavil.containsDate(new Date(2010, 10, 0))).toBeFalsy();
        expect(unavil.containsDate(new Date(2010, 11, 3))).toBeFalsy();
    });

    it('truncates dates to the hour', () => {
        let morning = new Date(2017, 11, 1, 10, 30, 44);
        let byHour = dayAndHourForDate(morning);
        expect(byHour).toEqual("2017/11/1@10");
    });

});