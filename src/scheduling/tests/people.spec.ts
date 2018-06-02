import {Person} from "../people";
import {csd} from "../common/date-utils";
import {Service} from "../service";
import {PeopleStore} from "../people-store";
import {Team} from "../teams";

describe('people', () => {
    let firstPerson: Person;
    let person_store: PeopleStore;
    let service: Service;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('neilos');
        service = new Service("test", new Team("Bar Scud"));
        person_store = new PeopleStore();
        person_store.add_person(firstPerson);
    });

    it('can add unavailable date', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalsy();
        firstPerson.add_unavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTruthy();
    });

    it('can add unavailability range', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalsy();
        firstPerson.add_unavailable_range(new Date(2010, 5, 1), new Date(2010, 11, 1));
        expect(firstPerson.is_unavailable_on(new Date(2010, 5, 1))).toBeTruthy();
        expect(firstPerson.is_unavailable_on(new Date(2010, 9, 1))).toBeTruthy();
        expect(firstPerson.is_unavailable_on(new Date(2011, 9, 1))).toBeFalsy();
    });

    it('unavailability range is inclusive of specified dates', function () {
        // Example from Jeremy, where he wasn't available on the 4th.
        let from = csd(2018, 1, 7);
        let to = csd(2018, 2, 4);
        firstPerson.add_unavailable_range(from, to);

        expect(firstPerson.is_unavailable_on(from)).toBeTruthy();
        expect(firstPerson.is_unavailable_on(to)).toBeTruthy();

        // Should expect the next day to be OK
        expect(firstPerson.is_unavailable_on(csd(2018, 2, 5))).toBeFalsy();
    });

    it('can remove unavailable date', () => {
        firstPerson.add_unavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTruthy();

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        firstPerson.remove_unavailable(recreatedDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalsy();
    });

    it('can add to people', () => {
        let newPerson: Person = new Person('John');

        person_store.add_person(newPerson);
        expect(person_store.people).toContain(newPerson);
        expect(person_store.people).toContain(firstPerson);
    });
});

