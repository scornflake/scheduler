import {PeopleStore, Person} from "./people";
import {defaultKeysRole, defaultLeaderRole, Role, RolesStore} from "./roles";
import {AssignedToRoleCondition, ScheduleOn} from "../scheduling/rule_based/rules";
import {csd} from "../common/date-utils";

describe('people, ', () => {
    let firstPerson: Person;
    let person_store: PeopleStore;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('neilos');
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

    it('can add dependent roles', () => {
        let cherilyn = new Person("Cherilyn");
        person_store.add_person(cherilyn)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole))

        expect(cherilyn.roles.length).toEqual(1);
        let rules = cherilyn.conditional_rules;
        expect(rules.length).toEqual(1);

        let first_rule = rules[0];
        expect(first_rule instanceof AssignedToRoleCondition).toBeTruthy();

        // TODO: could do more here
        // We don't test that the condition has actions, or that they fire
    });

    it('can sort people by role layout priority', () => {
        // people are in roles. Get a list of people based on their max role layout priority
        let role_store = new RolesStore();
        let leader = role_store.addRole(new Role("Leader", 10));
        let keys = role_store.addRole(new Role("Keys", 5));
        let gopher = role_store.addRole(new Role("Gopher", 1));

        // Tim = Keys
        let p2 = person_store.add_person(new Person("Tim").add_role(keys));
        // Janice = Gopher
        let p3 = person_store.add_person(new Person("Janice").add_role(gopher));
        // Neil = Gopher + Leader
        let p1 = person_store.add_person(new Person("Neil").add_role(gopher).add_role(leader));

        // Expect Neil, Tim, Janice
        let ordered = person_store.order_people_by_role_layout_priority();
        expect(ordered[0]).toEqual(p1);
        expect(ordered[1]).toEqual(p2);
        expect(ordered[2]).toEqual(p3);
    });
});