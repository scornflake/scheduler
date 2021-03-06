import {ScheduleAtDate} from "../../scheduling/shared";
import {Person} from "../../scheduling/people";
import {
    CleanupDefaultRoles,
    defaultBass,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSoundRole,
    SetupDefaultRoles
} from "../sample-data";
import {constructSensibleDate} from "../../scheduling/common/date-utils";
import {Plan} from "../../scheduling/plan";
import {Team} from "../../scheduling/teams";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Role} from "../../scheduling/role";

describe('schedule', () => {
    beforeAll(() => {
        SetupDefaultRoles();
    });

    afterAll(() => {
        CleanupDefaultRoles();
    });

    it('should be able to construct non retarded dates', function () {
        // For some bizarre reason 'month' starts at zero. Day doesn't. NICE one.
        let date = constructSensibleDate(2018, 1, 5);
        expect(date.toDateString()).toEqual("Fri Jan 05 2018");
    });

    it('should be setup!', function () {
        expect(defaultSoundRole).not.toBeNull("are roles setup?")
    });

    describe('with people', () => {
        let neil;
        let daniel;

        let sd;
        let team;
        let plan;

        beforeEach(() => {
            neil = new Person("neil");
            daniel = new Person("daniel");

            sd = new ScheduleAtDate(new Date(2000, 0, 0));
            team = new Team("Scud Missile");
            team.add(neil);
            team.add(daniel);
            plan = new Plan("test", team);
        });

        it('can return people in a role', () => {
            /*
            intentionally have not added roles to neil, daniel at the Service level.
            shouldn't be required for this test
             */

            let neil_assignment = plan.assignmentFor(neil);
            let daniel_assignment = plan.assignmentFor(daniel);
            sd.add_person(neil_assignment, defaultSoundRole);
            expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);

            sd.add_person(daniel_assignment, defaultBass);
            expect(sd.people_in_role(defaultBass)).toEqual([daniel]);
        });

        it('can sort people by role layout priority', () => {
            plan.addRole(defaultLeaderRole).layout_priority = 10;
            plan.addRole(defaultKeysRole).layout_priority = 5;
            let gopher = plan.addRole(new Role("Gopher"));
            plan.addRole(gopher).layout_priority = 1;


            let tim = team.add(new Person("Tim"));
            let janice = team.add(new Person("Janice"));

            // Tim = Keys
            let a2 = plan.assignmentFor(tim).addRole(defaultKeysRole);
            expect(plan.assignmentFor(tim)).not.toBeNull();

            // Janice = Gopher
            let a3 = plan.assignmentFor(janice).addRole(gopher);
            expect(plan.assignmentFor(janice)).not.toBeNull();

            // Neil = Gopher + Leader
            let neil_assignment = plan.assignmentFor(neil).addRole(gopher).addRole(defaultLeaderRole);
            sd.add_person(neil_assignment, defaultSoundRole);
            sd.add_person(plan.assignmentFor(tim), defaultKeysRole);
            sd.add_person(plan.assignmentFor(janice), gopher);

            // Expect Neil, Tim, Janice
            let ordered = sd.people_sorted_by_role_priority;
            console.log(`We have assignments for : ${SWBSafeJSON.stringify(sd.assignments.map(a => a.name))}`);
            console.log(`We have ordered: ${SWBSafeJSON.stringify(ordered.map(p => p.name))}`);
            expect(ordered[0]).toEqual(neil_assignment.person);
            expect(ordered[1]).toEqual(a2.person);
            expect(ordered[2]).toEqual(a3.person);
        });
    });


});