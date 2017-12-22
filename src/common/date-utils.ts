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

let csd = constructSensibleDate;

export {
    constructSensibleDate,
    addDaysToDate,
    isDateValid,
    throwOnInvalidDate,
    csd

}