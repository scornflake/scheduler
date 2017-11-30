import {PeopleStore, Person} from "./people";
import {defaultKeysRole, defaultLeaderRole, defaultSaxRole, defaultSoundRole, Role, RolesStore} from "./roles";
import {DependentPlacementRule, RuleFacts, UsageWeightedSequential} from "../scheduling/rule_based/rules";

describe('people, ', () => {
    let firstPerson: Person;
    let person_store: PeopleStore;
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        firstPerson = new Person('neilos', '1234');
        person_store = new PeopleStore();
        person_store.add_person(firstPerson);
    });

    it('can add unavailable date', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
        firstPerson.add_unavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTrue();
    });

    it('can add unavailability range', () => {
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
        firstPerson.add_unavailable_range(new Date(2010, 5, 1), new Date(2010, 11, 1));
        expect(firstPerson.is_unavailable_on(new Date(2010, 5, 1)));
        expect(firstPerson.is_unavailable_on(new Date(2010, 9, 1)));
        expect(firstPerson.is_unavailable_on(new Date(2011, 9, 1)));
    });


    it('can remove unavailable date', () => {
        firstPerson.add_unavailable(someDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeTrue();

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        firstPerson.remove_unavailable(recreatedDate);
        expect(firstPerson.is_unavailable_on(someDate)).toBeFalse();
    });

    it('can add to people', () => {
        let newPerson: Person = new Person('John', '4321');

        person_store.add_person(newPerson);
        expect(person_store.people).toContain(newPerson);
        expect(person_store.people).toContain(firstPerson);
    });

    it('can add dependent roles', () => {
        let cherilyn = new Person("Cherilyn");
        person_store.add_person(cherilyn)
            .when_in_role(defaultLeaderRole, [defaultKeysRole]);

        expect(cherilyn.roles.length).toEqual(1);
        let rules = cherilyn.placement_rules_for_role(defaultLeaderRole);

        expect(rules.length).toEqual(1);

        let first_rule = rules[0];
        expect(first_rule instanceof DependentPlacementRule).toBeTrue();

        if (first_rule instanceof DependentPlacementRule) {
            expect(first_rule.additional_roles).toEqual([defaultKeysRole]);
        }
    });

    it('can sort people by role layout priority', () => {
        // people are in roles. Get a list of people based on their max role layout priority
        let role_store = new RolesStore();
        let leader = role_store.addRole(new Role("Leader", null, 10));
        let keys = role_store.addRole(new Role("Keys", null, 5));
        let gopher = role_store.addRole(new Role("Gopher", null, 1));

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