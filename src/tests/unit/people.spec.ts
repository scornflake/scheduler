import {Person} from "../../scheduling/people";
import {csd} from "../../scheduling/common/date-utils";
import {Plan} from "../../scheduling/plan";
import {Team} from "../../scheduling/teams";
import {PersonManager, SchedulerObjectStore} from "../../scheduling/common/scheduler-store";
import {AvailabilityEveryNOfM} from "../../scheduling/availability";
import {SafeJSON} from "../../common/json/safe-stringify";

describe('people', () => {
    let schedulerObjectStore: SchedulerObjectStore;
    let firstPerson: Person;
    let person_store: PersonManager;
    let plan: Plan;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('neilos');
        plan = new Plan("test", new Team("Bar Scud"));

        schedulerObjectStore = new SchedulerObjectStore();
        person_store = schedulerObjectStore.people;
        person_store.add(firstPerson);
    });

    it('can add unavailable date', () => {
        expect(firstPerson.isUnavailableOn(someDate)).toBeFalsy();
        firstPerson.addUnavailable(someDate);
        expect(firstPerson.isUnavailableOn(someDate)).toBeTruthy();
    });

    it('should not add same unavailability twice', function () {
        firstPerson.addUnavailable(someDate);
        expect(firstPerson.unavailable.length).toBe(1);
        firstPerson.addUnavailable(someDate);
        expect(firstPerson.unavailable.length).toBe(1);
    });

    it('can set alternate avail', () => {
        expect(firstPerson).not.toBeNull();
        let new_one = new AvailabilityEveryNOfM(2, 3);
        expect(new_one.constructor.name).toEqual('AvailabilityEveryNOfM');
        firstPerson.availability = new_one;
        expect(firstPerson.availability.constructor.name).toEqual('AvailabilityEveryNOfM');
    });

    it('should not add same unavailability ranges twice', function () {
        firstPerson.addUnavailableRange(csd(2010, 5, 1), csd(2010, 11, 1));
        expect(firstPerson.unavailable.length).toBe(1, "expected first addition to give just one!!!");
        firstPerson.addUnavailableRange(csd(2010, 5, 1), csd(2010, 11, 1));
        expect(firstPerson.unavailable.length).toBe(1, `odd: got more than 1, ${firstPerson.unavailable}`);
    });

    it('can add unavailability range', () => {
        expect(firstPerson.isUnavailableOn(someDate)).toBeFalsy();
        firstPerson.addUnavailableRange(new Date(2010, 5, 1), new Date(2010, 11, 1));
        expect(firstPerson.isUnavailableOn(new Date(2010, 5, 1))).toBeTruthy();

        console.log(`Person unavailable on: ${SafeJSON.stringify(firstPerson.unavailable)}`);
        expect(firstPerson.isUnavailableOn(new Date(2010, 9, 1))).toBeTruthy();
        // expect(firstPerson.is_unavailable_on(new Date(2011, 9, 1))).toBeFalsy();
    });

    it('unavailability range is inclusive of specified dates', function () {
        // Example from Jeremy, where he wasn't available on the 4th.
        let from = csd(2018, 1, 7);
        let to = csd(2018, 2, 4);
        firstPerson.addUnavailableRange(from, to);

        expect(firstPerson.isUnavailableOn(from)).toBeTruthy();
        expect(firstPerson.isUnavailableOn(to)).toBeTruthy();

        // Should expect the next day to be OK
        expect(firstPerson.isUnavailableOn(csd(2018, 2, 5))).toBeFalsy();
    });

    it('can remove unavailable date', () => {
        let unavail = firstPerson.addUnavailable(someDate);
        expect(firstPerson.isUnavailableOn(someDate)).toBeTruthy();

        // a new date instance
        firstPerson.removeUnavailable(unavail);
        expect(firstPerson.isUnavailableOn(someDate)).toBeFalsy();
    });

    it('can add to people', () => {
        let newPerson: Person = new Person('John');

        person_store.add(newPerson);
        expect(person_store.people).toContain(newPerson);
        expect(person_store.people).toContain(firstPerson);
    });
});

