import * as moment from "moment";
import {Moment} from "moment";

let constructSensibleDate = (year: number, month: number, day: number) => {
    return new Date(year, month - 1, day);
};

let addDaysToDate = (date: Date, days: number): Date => {
    let new_date = new Date(date);
    new_date.setDate(date.getDate() + days);
    return new_date;
};

let isDateValid = (date: Date): boolean => {
    return !isNaN(date.getTime());
};

let throwOnInvalidDate = (date: Date, message: string = "Date is not valid") => {
    if (!isDateValid(date)) {
        throw new Error(message);
    }
};

let formatDateForGoogleSpreadsheet = (date: Date): string => {
    return date.toDateString();
};

let parseDateFromSpreadsheetDate = (date_as_string: string): Date => {
    let moment_date = parseMomentDateFromSpreadsheetDate(date_as_string);
    if (moment_date && moment_date.isValid()) {
        return moment_date.toDate();
    }
    return null;
};

let parseMomentDateFromSpreadsheetDate = (date_as_string: string): Moment => {
    let moment_date = moment(date_as_string, "ddd MMM DD YYYY");
    if (moment_date.isValid()) {
        return moment_date;
    }
    return null;
};

let dayAndHourForDate = (date: Date): string => {
    if (date == null) {
        return "";
    }
    return date.getFullYear() + "/" + date.getMonth() + "/" + date.getDate() + "@" + date.getHours();
};

let csd = constructSensibleDate;

export {
    constructSensibleDate,
    addDaysToDate,
    isDateValid,
    throwOnInvalidDate,
    formatDateForGoogleSpreadsheet,
    dayAndHourForDate,
    parseDateFromSpreadsheetDate,
    parseMomentDateFromSpreadsheetDate,
    csd

}