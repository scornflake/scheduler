import {PeopleStore, Person} from "./people";

describe('people, ', () => {
    let firstPerson: Person;

    let person_store: PeopleStore;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('1234', 'neilos');
        person_store = new PeopleStore();
        person_store.addPerson(firstPerson);
    });

    it('can add unavailable date', () => {
        firstPerson.addUnavailable(someDate);

        // console.log("Pre State: " + JSON.stringify(state));
        // console.log("All State: " + JSON.stringify(allPersons));
        expect(firstPerson.unavailable).toContain(someDate)
    });

    it('can remove unavailable date', () => {
        firstPerson.addUnavailable(someDate);

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        firstPerson.removeUnavailable(recreatedDate);
        expect(firstPerson.unavailable).not.toContain(someDate)
    });

    it('can add to people', () => {
        let newPerson: Person = new Person('4321', 'John');

        person_store.addPerson(newPerson);
        expect(person_store.people).toContain(newPerson);
        expect(person_store.people).toContain(firstPerson);
    });

});