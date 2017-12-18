let constructSensibleDate = (year: number, month: number, day: number) => {
    return new Date(year, month - 1, day);
};

let csd = constructSensibleDate;

export {
    constructSensibleDate,
    csd

}