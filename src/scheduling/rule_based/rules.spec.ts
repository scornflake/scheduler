import {
    FixedRoleOnDate,
    OnThisDate,
    PickRules,
    Rules,
    RuleState,
    UsageWeightedSequential,
    WeightedRoles
} from "./rules";
import {PeopleStore, Person} from "../../state/people";
import {Role} from "../../state/roles";

describe('rules', () => {
    let store = new PeopleStore();
    let state;
    let p1, p2, p3: Person;
    let date: Date;

    beforeEach(() => {
        store = new PeopleStore();
        state = new RuleState();

        // If we have people in order, it just returns sequentially
        p1 = store.addPerson(new Person("Neil"));
        p2 = store.addPerson(new Person("Bob"));
        p3 = store.addPerson(new Person("Tim"));

        date = new Date(2010, 10, 0);
        state.date = date;
        state.person = p1;
    });

    describe('role rules', () => {
        let role1 = new Role("Foo");
        let role2 = new Role("Bar");
        let weightings: Map<Role, number>;

        beforeEach(() => {
            weightings = new Map<Role, number>();
            weightings.set(role1, 1);
            weightings.set(role2, 1);
        });

        it('can normalize weighted roles', () => {
            weightings.set(role1, 10);
            weightings.set(role2, 20);
            let wr = new WeightedRoles(weightings);

            let new_weights = wr.weightedRoles.values();
            expect(new_weights.next().value).toBeNear(0.333, 0.01);
            expect(new_weights.next().value).toBeNear(0.666, 0.01);
            expect(new_weights.next().value).toBeUndefined();
        });

        it('weighted rules, sames weights, give sequential results', () => {
            let wr = new WeightedRoles(weightings);
            let iterator = wr.execute(state);

            // check it gives same result until 'used_role' is called
            for (let i = 0; i < 10; i++) {
                expect(iterator.next().value.name).toEqual("Foo");
            }

            // mark as used.
            wr.use_this_role(iterator.next().value);

            // check it gives next result until 'used_role' is called
            for (let i = 0; i < 10; i++) {
                expect(iterator.next().value.name).toEqual("Bar");
            }
            wr.use_this_role(iterator.next().value);
            expect(iterator.next().value.name).toEqual("Foo");
        });

        it('weighted rules obey weightings', () => {
            weightings.set(role1, 0.9);
            weightings.set(role2, 0.1);
            let wr = new WeightedRoles(weightings);

            let iterator = wr.execute(state);
            let choice_counter = new Map<Role, number>();
            for (let i = 0; i < 1000; i++) {
                let role = iterator.next().value;
                wr.use_this_role(role);
                let score = choice_counter.has(role) ? choice_counter.get(role) : 0;
                choice_counter.set(role, score + 1);
            }

            expect(choice_counter.get(role1)).toEqual(900);
            expect(choice_counter.get(role2)).toEqual(100);
        });


        it('can sort by score', () => {
            let wr = new WeightedRoles(weightings);

            wr.use_this_role(role1);
            expect(wr.roles_sorted_by_score).toEqual([role2, role1]);

            wr.use_this_role(role2);
            expect(wr.roles_sorted_by_score).toEqual([role1, role2]);
            wr.use_this_role(role2);
            expect(wr.roles_sorted_by_score).toEqual([role1, role2]);

            wr.use_this_role(role1);
            expect(wr.roles_sorted_by_score).toEqual([role1, role2]);

            wr.use_this_role(role1);
            expect(wr.roles_sorted_by_score).toEqual([role2, role1]);
        });

        it('can sort roles by weight', () => {
            weightings.set(role1, 0.5);
            weightings.set(role2, 0.6);
            let wr = new WeightedRoles(weightings);

            expect(wr.roles_sorted_by_weight).toEqual([role1, role2]);

            weightings.set(role1, 1);
            weightings.set(role2, 0.6);
            wr = new WeightedRoles(weightings);
            expect(wr.roles_sorted_by_weight).toEqual([role2, role1]);
        });

        it('can return fixed role on date', () => {
            let rule = new FixedRoleOnDate(date, role2);
            expect(rule.execute(state).next().value).toEqual(role2);
            state.date = new Date(2013, 3, 4);
            expect(rule.execute(state).next().value).toEqual(null);
        });

        it('can sum scores', () => {
            weightings.set(role1, 0.5);
            weightings.set(role2, 0.6);
            let wr = new WeightedRoles(weightings);

            wr.use_this_role(role1);
            expect(wr.total_uses).toEqual(1);
            wr.use_this_role(role1);
            expect(wr.total_uses).toEqual(2);
            wr.use_this_role(role2);
            expect(wr.total_uses).toEqual(3);
        });

        it('has score 0 when empty', () => {
            let wr = new WeightedRoles(new Map<Role, number>());
            expect(wr.total_uses).toEqual(0);
        });

        it('can execute single rules', () => {
            let rules = new Rules();
            rules.addRule(new FixedRoleOnDate(date, role2));

            let iterator = rules.execute(state);
            expect(iterator.next().value).toEqual(role2);

            state.date = new Date(2011, 1, 1);
            expect(iterator.next().value).toEqual(null);
        });

        it('can execute many rules', () => {
            let rules = new Rules();

            rules.addRule(new FixedRoleOnDate(date, role2, 10));
            rules.addRule(new WeightedRoles(weightings));

            let iterator = rules.execute(state);
            expect(iterator.next().value).toEqual(role2);

            state.date = new Date(2011, 1, 1);
            let next_role = iterator.next().value;
            expect(next_role).toEqual(role1);
            rules.use_this_role(next_role);
            expect(iterator.next().value).toEqual(role2);
            rules.use_this_role(next_role);
        });

    });

    describe('pick rules', () => {
        it('simple sequential', () => {
            // If we have people in order, it just returns sequentially
            let uw = new UsageWeightedSequential(store.people);

            expect(uw.execute(state).next().value).toEqual(p1);
            uw.use_this_person(p1);

            expect(uw.execute(state).next().value).toEqual(p2);
            uw.use_this_person(p2);

            expect(uw.execute(state).next().value).toEqual(p3);
            uw.use_this_person(p3);

            expect(uw.execute(state).next().value).toEqual(p1);
        });

        it('on this date rule', () => {
            let dateRule = new OnThisDate(date, p1);

            // Execute for this date. Should work.
            let iterator = dateRule.execute(state);
            expect(iterator.next().value).toEqual(p1);
            expect(iterator.next().value).toEqual(null);

            // Do it for a different date that doesn't match, shouldn't come back with anything.
            state.date = new Date(2012, 1, 2);
            iterator = dateRule.execute(state);
            expect(iterator.next().value).toEqual(null);
        });


        it('test unavailable', () => {
            let uw = new UsageWeightedSequential(store.people);

            let series_of_people = uw.execute(state);

            // Lets say p1 isn't available (so we don't call increment)
            expect(series_of_people.next().value).toEqual(p1);

            expect(series_of_people.next().value).toEqual(p2);
            // We DO use p2.
            uw.use_this_person(p2);

            // Now when we come to do this again, we want to see p1 first
            series_of_people = uw.execute(state);
            expect(series_of_people.next().value).toEqual(p1);

            // then p3 (because p2 was used, above)
            expect(series_of_people.next().value).toEqual(p3);

            // THEN p2
            expect(series_of_people.next().value).toEqual(p2);
        });

        it('a group of one rule looks like it has just one rule', () => {
            let rules = new Rules();
            let dateRule = new OnThisDate(date, p3, 5);
            rules.addRule(dateRule);

            let iterator = rules.execute(state);
            expect(iterator.next().value).toEqual(p3);
            expect(iterator.next().value).toEqual(null);
        });

        it('can execute many rules', () => {
            let rules = new Rules();

            // Means: choose Tim on date 'date'
            let dateRule = new OnThisDate(date, p3, 5);

            // Means, use weighted sequential (Neil, Bob, Tim).
            let uw = new UsageWeightedSequential(store.people, 1);
            rules.addRule(uw);
            rules.addRule(dateRule);

            // Running on date = date, should get Tim, Neil, Bob, Tim
            let iterator = rules.execute(state);
            expect(iterator.next().value).toEqual(p3);
            expect(iterator.next().value).toEqual(p1);
            expect(iterator.next().value).toEqual(p2);
            expect(iterator.next().value).toEqual(p3);
            expect(iterator.next().value).toEqual(null);
        });
    });
});