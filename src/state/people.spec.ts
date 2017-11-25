import {PeopleStore, Person} from "./people";
import {defaultKeysRole, defaultLeaderRole} from "./roles";

describe('people, ', () => {
    let firstPerson: Person;

    let person_store: PeopleStore;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('neilos', '1234');
        person_store = new PeopleStore();
        person_store.addPerson(firstPerson);
    });

    it('can add unavailable date', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
        firstPerson.addUnavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTrue();
    });

    it('can add unavailability range', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
        firstPerson.addUnavailableRange(new Date(2010, 5, 1), new Date(2010, 11, 1));
        expect(firstPerson.is_unavailable_on(new Date(2010, 5, 1)));
        expect(firstPerson.is_unavailable_on(new Date(2010, 9, 1)));
        expect(firstPerson.is_unavailable_on(new Date(2011, 9, 1)));
    });


    it('can remove unavailable date', () => {
        firstPerson.addUnavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTrue();

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        firstPerson.removeUnavailable(recreatedDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
    });

    it('can add to people', () => {
        let newPerson: Person = new Person('John', '4321');

        person_store.addPerson(newPerson);
        expect(person_store.people).toContain(newPerson);
        expect(person_store.people).toContain(firstPerson);
    });

    it('can add dependent roles', () => {
        let cherilyn = new Person("Cherilyn");
        person_store.addPerson(cherilyn)
            .with_dep_role(defaultLeaderRole, [defaultKeysRole]);

        expect(cherilyn.roles.length).toEqual(1);
        let dependentRolesFor = Array.from(cherilyn.role_include_dependents_of(defaultLeaderRole));
        expect(dependentRolesFor).toEqual([defaultLeaderRole, defaultKeysRole]);
    });


});