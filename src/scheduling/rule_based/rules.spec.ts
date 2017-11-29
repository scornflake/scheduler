import {
    FixedRoleOnDate,
    OnThisDate,
    RuleFacts,
    UsageWeightedSequential,
    WeightedRoles
} from "./rules";
import {PeopleStore, Person} from "../../state/people";
import {defaultSoundRole, Role, RolesStore} from "../../state/roles";

describe('rules', () => {
    let people_store: PeopleStore;
    let role_store: RolesStore;
    let state;
    let neil, bob, tim: Person;
    let date: Date;

    beforeEach(() => {
        people_store = new PeopleStore();
        role_store = new RolesStore();
        state = new RuleFacts(people_store, role_store);

        // If we have people in order, it just returns sequentially
        neil = people_store.addPerson(new Person("Neil").addRole(defaultSoundRole));
        bob = people_store.addPerson(new Person("Bob").addRole(defaultSoundRole));
        tim = people_store.addPerson(new Person("Tim").addRole(defaultSoundRole));

        date = new Date(2010, 10, 0);
        state.date = date;
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
            let role_list = wr.execute(state, neil);

            // check we get the first role in the list back
            expect(role_list[0].name).toEqual("Foo");

            // Now modify state to say this role has been used
            state.use_this_person_in_role(neil, role1);

            // Now it should give a different role for neil
            role_list = wr.execute(state, neil);
            expect(role_list[0].name).toEqual("Bar");

            state.use_this_person_in_role(neil, role2);

            // annnd... back to the first (because weights are equal)
            role_list = wr.execute(state, neil);
            expect(role_list[0].name).toEqual("Foo");
        });

        it('weighted rules obey weightings', () => {
            weightings.set(role1, 0.9);
            weightings.set(role2, 0.1);
            let wr = new WeightedRoles(weightings);

            for (let i = 0; i < 1000; i++) {
                let role_list = wr.execute(state, neil);
                expect(role_list.length).toBeGreaterThan(0);

                let role = role_list[0];
                expect(role).not.toBeNull();
                state.use_this_person_in_role(neil, role);
            }

            expect(state.number_of_times_role_used_by_person(role1, neil)).toEqual(900);
            expect(state.number_of_times_role_used_by_person(role2, neil)).toEqual(100);
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
            expect(rule.execute(state)).toEqual(role2);

            state.date = new Date(2000, 0, 0);
            expect(rule.execute(state)).toEqual(null);
        });

        it('state can record usage score for people', () => {
            state.use_this_person_in_role(neil, role1);
            expect(state.total_number_of_times_person_placed_in_roles(neil, [role1])).toEqual(1);

            state.use_this_person_in_role(neil, role1);
            expect(state.total_number_of_times_person_placed_in_roles(neil, [role1])).toEqual(2);

            // Check role2 has no bearing on value for role1
            state.use_this_person_in_role(neil, role2);
            expect(state.total_number_of_times_person_placed_in_roles(neil, [role1])).toEqual(2);
        });

        it('state scores are zero at start', () => {
            expect(state.total_number_of_times_person_placed_in_roles(neil, [defaultSoundRole])).toEqual(0);
            expect(state.total_number_of_times_person_placed_in_roles(tim, [defaultSoundRole])).toEqual(0);
        });
    });

    describe('pick rules', () => {
        it('can do sequentially', () => {
            // If we have people in order, it just returns sequentially
            let uw = new UsageWeightedSequential(people_store.people);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(neil);
            state.use_this_person_in_role(neil, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(bob);
            state.use_this_person_in_role(bob, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(tim);
            state.use_this_person_in_role(tim, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(neil);
        });

        it('simulated unavailability affects scoring', () => {
            let uw = new UsageWeightedSequential(people_store.people);

            // We expect neil first.
            let people_in_order = uw.execute(state, defaultSoundRole);
            expect(people_in_order[0]).toEqual(neil);

            // and bob next.
            expect(people_in_order[1]).toEqual(bob, defaultSoundRole);

            // If we change the facts so that bob did do the role, and re-execute the
            // rule, we expect bob to NOT be the 2nd choice any more.
            state.use_this_person_in_role(bob, defaultSoundRole);

            // Now when we come to do this again, we want to see neil first
            people_in_order = uw.execute(state, defaultSoundRole);
            expect(people_in_order[0]).toEqual(neil);

            // then tim (because bob was used, above)
            expect(people_in_order[1]).toEqual(tim);

            // THEN bob
            expect(people_in_order[2]).toEqual(bob);
        });

        it('can pick a person for a role on a date', () => {
            let dateRule = new OnThisDate(date, neil, defaultSoundRole);

            // Execute for this date. Should work.
            let value = dateRule.execute(state);
            expect(value).toEqual(neil);

            // Do it for a different date that doesn't match, shouldn't come back with anything.
            state.date = new Date(2012, 1, 2);
            value = dateRule.execute(state);
            expect(value).toEqual(null);
        });
    });
});