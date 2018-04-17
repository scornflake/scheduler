import {Unavailablity} from "../state/unavailability";
import {dayAndHourForDate, parseDateFromSpreadsheetDate} from "../common/date-utils";

describe('unavailability', () => {
    it('can parse dates', () => {
        let dateString = "Sun May 27 2018";
        let js_date = parseDateFromSpreadsheetDate(dateString);
        console.log(`Got: ${JSON.stringify(js_date)}`);
        expect(js_date.getMonth()).toEqual(4);
        expect(js_date.getFullYear()).toEqual(2018);
        expect(js_date.getDate()).toEqual(27);
    });

    it('can parse null date and get null', function () {
        expect(parseDateFromSpreadsheetDate(null)).toBeNull();
    });

    it('can model single date', () => {
        let unavil = new Unavailablity(new Date(2010, 10, 1));
        expect(unavil.matches_single_date(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.matches_single_date(new Date(2010, 11, 1))).toBeFalsy();
        expect(unavil.matches_single_date(new Date(2009, 10, 1))).toBeFalsy();
    });

    it('takes into account hours', () => {
        let unavil = new Unavailablity(new Date(2010, 10, 1, 10));
        expect(unavil.matches_single_date(new Date(2010, 10, 1, 10))).toBeTruthy();
        expect(unavil.matches_single_date(new Date(2010, 10, 1, 10, 20))).toBeTruthy();
        expect(unavil.matches_single_date(new Date(2010, 10, 1, 11, 20))).toBeFalsy();
    });

    it('can check for date being "in" a day', () => {
        let unavil = new Unavailablity(new Date(2010, 10, 1));
        expect(unavil.contains_date(new Date(2010, 10, 1, 10))).toBeTruthy();

        expect(unavil.contains_date(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.contains_date(new Date(2010, 10, 0))).toBeFalsy();
        expect(unavil.contains_date(new Date(2010, 10, 2))).toBeFalsy();
    });

    it('can model a date range', () => {
        let unavil = new Unavailablity(new Date(2010, 10, 1), new Date(2010, 11, 2));
        expect(unavil.contains_date(new Date(2010, 10, 1))).toBeTruthy();
        expect(unavil.contains_date(new Date(2010, 10, 1, 10))).toBeTruthy();
        expect(unavil.contains_date(new Date(2010, 11, 1))).toBeTruthy();

        expect(unavil.contains_date(new Date(2010, 10, 0))).toBeFalsy();
        expect(unavil.contains_date(new Date(2010, 11, 3))).toBeFalsy();
    });

    it('truncates dates to the hour', () => {
        let morning = new Date(2017, 11, 1, 10, 30, 44);
        let byHour = dayAndHourForDate(morning);
        expect(byHour).toEqual("2017/11/1@10");
    });

});