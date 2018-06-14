import {SchedulerObjectStore} from "../../scheduling/common/scheduler-store";
import {Person} from "../../scheduling/people";
import {Role} from "../../scheduling/role";
import {Plan} from "../../scheduling/plan";
import {csd} from "../../scheduling/common/date-utils";
import {Team} from "../../scheduling/teams";
import {OnThisDate} from "../../scheduling/rule_based/rules";
import {defaultSoundRole} from "../sample-data";

describe('object store', () => {
    let store;
    beforeEach(() => {
        store = new SchedulerObjectStore();
    });

    it('can store people', () => {
        let p = new Person("Neil");
        store.add_object_to_array(p);
        expect(store.find(o => o.name == "Neil")).toEqual(p);
    });

    describe('role ref integrity test', () => {
        let role;
        let team;
        let plan;
        let neil;

        beforeEach(() => {
            team = new Team('Lemon');
            role = new Role("hey!");
            neil = new Person('neil');

            team.add(neil);
            store.teams.add(team);
            store.roles.add(role);

            plan = new Plan("Super Cunning", team);
            store.plans.add(plan);
        });

        it('can delete role if not in use', function () {
            // works cos no one using it
            expect(store.roles.length).toEqual(1);

            store.roles.remove(role);
            expect(store.roles.length).toEqual(0);
        });

        it('cannot delete if used in plan', function () {
            plan.add_role(role);
            expect(() => {
                store.roles.remove(role);
            }).toThrowError(/Cannot delete role/);
        });

        it('cannot be deleted if part of assignment role weighting', () => {
            plan.assignment_for(neil).add_role(role);
            expect(() => {
                store.roles.remove(role);
            }).toThrowError(/Cannot delete role/);
        });

        it('cannot be removed if used in FixedRoleOnDate', () => {
            // TODO, because I can't see where this is added into the rules/engine just yet
            // Seems it is used by RuleFacts (begin) getting all_role_rules, which
            // iterates all the role rules of each Assignment.
            // But: can't see how FixedRoleOnDate ever makes its way to an Assignment
        });

        it('cannot be removed if used in OnThisDate', () => {
            let neil_assign = plan.assignment_for(neil);
            plan.addPickRule(new OnThisDate(csd(2011, 1, 1), neil_assign, role));
            expect(() => {
                store.roles.remove(role);
            }).toThrowError(/Cannot delete role/);
        });

        it('cannot be removed if used in "if_assigned_to" / AssignedToRoleCondition', () => {
            let neil_assign = plan.assignment_for(neil);
            neil_assign.if_assigned_to(role);

            // so that this test doesn't pass because the role is part of other
            // role based integrity tests
            plan.remove_role(role);
            neil_assign.remove_role(role);

            expect(() => {
                store.roles.remove(role);
            }).toThrowError(/Cannot delete role/);
        });

        it('cannot be removed if used in ScheduleOn', () => {
            let neil_assign = plan.assignment_for(neil);
            neil_assign.if_assigned_to(defaultSoundRole).then(role);

            // so that this test doesn't pass because the role is part of other
            // role based integrity tests
            plan.remove_role(role);
            neil_assign.remove_role(role);

            expect(() => {
                store.roles.remove(role);
            }).toThrowError(/Cannot delete role/);
        });
    });

});