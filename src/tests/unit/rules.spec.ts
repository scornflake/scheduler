import {FixedRoleOnDate, OnThisDate, UsageWeightedSequential, WeightedRoles} from "../../scheduling/rule_based/rules";
import {Person} from "../../scheduling/people";
import {RuleFacts} from "../../scheduling/rule_based/rule-facts";
import {SafeJSON} from "../../common/json/safe-stringify";
import {defaultSoundRole, SetupDefaultRoles} from "../sample-data";
import {Plan} from "../../scheduling/plan";
import {Assignment} from "../../scheduling/assignment";
import {Team} from "../../scheduling/teams";
import {Role} from "../../scheduling/role";
import {PersonManager, SchedulerObjectStore} from "../../scheduling/common/scheduler-store";

describe('rules', () => {
    let people_store: PersonManager;
    let state, service;
    let neil: Person, bob: Person, tim: Person;
    let neil_assign: Assignment, bob_assign: Assignment, tim_assign: Assignment;
    let date: Date;
    let team: Team;


    beforeEach(() => {
        SetupDefaultRoles();

        people_store = new SchedulerObjectStore().people;
        team = new Team("Foo Bar");
        service = new Plan("rules tests", team);
        state = new RuleFacts(service);

        // If we have people in order, it just returns sequentially
        neil = team.getOrAddPerson(new Person("Neil"));
        neil_assign = service.assignmentFor(neil).addRole(defaultSoundRole);

        bob = team.add(new Person("Bob"));
        bob_assign = service.assignmentFor(bob).addRole(defaultSoundRole);

        tim = team.add(new Person("Tim"));
        tim_assign = service.assignmentFor(tim).addRole(defaultSoundRole);

        date = new Date(2010, 10, 0);
        state.current_date = date;
    });

    it('can filter by date range', function () {
        state.begin_new_role(date);
        state.place_person_in_role(neil_assign, defaultSoundRole, date);

        /*
        Intentionally unordered, to test that the filter returns a sorted list
         */

        let next_date = new Date(date);
        next_date.setDate(date.getDate() + 14);
        state.begin_new_role(next_date);
        state.place_person_in_role(neil_assign, defaultSoundRole, next_date);

        next_date = new Date(date);
        next_date.setDate(date.getDate() + 7);
        state.begin_new_role(next_date);
        state.place_person_in_role(neil_assign, defaultSoundRole, next_date);

        let dates = state.schedule_dates;
        console.log("Have: " + SafeJSON.stringify(dates));
        for (let schedule of dates) {
            console.log(`${schedule.date.toDateString()} - ${schedule.valueOf()}`);
        }

        console.log("October...");
        let october = state.filter(new Date(2010, 9, 1), new Date(2010, 9, 31));
        expect(october.length).toBe(1);
        expect(october[0].date.getDate()).toEqual(31);


        console.log("November (just one)...");
        let in_nov = state.filter(new Date(2010, 10, 7), new Date(2010, 10, 7));
        expect(in_nov.length).toBe(1);
        expect(in_nov[0].date.getDate()).toEqual(7);
        for (let schedule of in_nov) {
            console.log(schedule.date.toDateString() + " - " + schedule.valueOf());
        }

        console.log("November (all)...");
        in_nov = state.filter(new Date(2010, 10, 1), new Date(2010, 10, 30));
        expect(in_nov.length).toBe(2);
        expect(in_nov[0].date.getDate()).toEqual(7);
        expect(in_nov[1].date.getDate()).toEqual(14);
        for (let schedule of in_nov) {
            console.log(schedule.date.toDateString() + " - " + schedule.valueOf());
        }
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
            expect(new_weights.next().value).toBeCloseTo(0.333, 0.01);
            expect(new_weights.next().value).toBeCloseTo(0.666, 0.01);
            expect(new_weights.next().value).toBeUndefined();
        });

        it('weighted rules, sames weights, give sequential results', () => {
            let wr = new WeightedRoles(weightings);
            let role_list = wr.execute(state, neil_assign);

            // check we get the first role in the list back
            expect(role_list[0].name).toEqual("Foo");

            // Now modify state to say this role has been used
            state.use_this_person_in_role(neil_assign, role1);

            // Now it should give a different role for neil
            role_list = wr.execute(state, neil_assign);
            expect(role_list[0].name).toEqual("Bar");

            state.use_this_person_in_role(neil_assign, role2);

            // annnd... back to the first (because weights are equal)
            role_list = wr.execute(state, neil_assign);
            expect(role_list[0].name).toEqual("Foo");
        });

        it('weighted rules obey weightings', () => {
            weightings.set(role1, 0.9);
            weightings.set(role2, 0.1);
            let wr = new WeightedRoles(weightings);

            for (let i = 0; i < 1000; i++) {
                let role_list = wr.execute(state, neil_assign);
                expect(role_list.length).toBeGreaterThan(0);

                let role = role_list[0];
                expect(role).not.toBeNull();
                state.use_this_person_in_role(neil_assign, role);
            }

            expect(state.number_of_times_role_used_by_person(role1, neil_assign)).toEqual(900);
            expect(state.number_of_times_role_used_by_person(role2, neil_assign)).toEqual(100);
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

            state.current_date = new Date(2000, 0, 0);
            expect(rule.execute(state)).toEqual(null);
        });

        it('state can record usage score for people', () => {
            state.use_this_person_in_role(neil_assign, role1);
            expect(state.total_number_of_times_person_placed_in_roles(neil_assign, [role1])).toEqual(1);

            state.use_this_person_in_role(neil_assign, role1);
            expect(state.total_number_of_times_person_placed_in_roles(neil_assign, [role1])).toEqual(2);

            // Check role2 has no bearing on value for role1
            state.use_this_person_in_role(neil_assign, role2);
            expect(state.total_number_of_times_person_placed_in_roles(neil_assign, [role1])).toEqual(2);
        });

        it('state scores are zero at start', () => {
            expect(state.total_number_of_times_person_placed_in_roles(neil_assign, [defaultSoundRole])).toEqual(0);
            expect(state.total_number_of_times_person_placed_in_roles(tim_assign, [defaultSoundRole])).toEqual(0);
        });
    });

    describe('pick rules', () => {
        it('can do sequentially', () => {
            // If we have people in order, it just returns sequentially
            let uw = new UsageWeightedSequential(service.assignments);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(neil_assign);
            state.use_this_person_in_role(neil_assign, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(bob_assign);
            state.use_this_person_in_role(bob_assign, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(tim_assign);
            state.use_this_person_in_role(tim_assign, defaultSoundRole);

            expect(uw.execute(state, defaultSoundRole)[0]).toEqual(neil_assign);
        });

        it('simulated unavailability affects scoring', () => {
            let uw = new UsageWeightedSequential(service.assignments);

            // We expect neil first.
            let people_in_order = uw.execute(state, defaultSoundRole);
            expect(people_in_order[0]).toEqual(neil_assign);

            // and bob next.
            expect(people_in_order[1]).toEqual(bob_assign, defaultSoundRole);

            // If we change the facts so that bob did do the role, and re-execute the
            // rule, we expect bob to NOT be the 2nd choice any more.
            state.use_this_person_in_role(bob_assign, defaultSoundRole);

            // Now when we come to do this again, we want to see neil first
            people_in_order = uw.execute(state, defaultSoundRole);
            expect(people_in_order[0]).toEqual(neil_assign);

            // then tim (because bob was used, above)
            expect(people_in_order[1]).toEqual(tim_assign);

            // THEN bob
            expect(people_in_order[2]).toEqual(bob_assign);
        });

        it('can pick a person for a role on a date', () => {
            let dateRule = new OnThisDate(date, neil_assign, defaultSoundRole);

            // Execute for this date. Should work.
            let value = dateRule.execute(state);
            expect(value).toEqual(neil_assign);

            // Do it for a different date that doesn't match, shouldn't come back with anything.
            state.current_date = new Date(2012, 1, 2);
            value = dateRule.execute(state);
            expect(value).toEqual(null);
        });
    });
});