import {ScheduleAtDate} from "../../scheduling/shared";
import {Person} from "../../scheduling/people";
import {defaultBass, defaultSoundRole, SetupDefaultRoles} from "../sample-data";
import {constructSensibleDate} from "../../scheduling/common/date-utils";
import {Plan} from "../../scheduling/plan";
import {Team} from "../../scheduling/teams";
import {SafeJSON} from "../../common/json/safe-stringify";

describe('schedule', () => {
    beforeEach(() => {
        SetupDefaultRoles();
    });

    it('should be able to construct non retarded dates', function () {
        // For some bizarre reason 'month' starts at zero. Day doesn't. NICE one.
        let date = constructSensibleDate(2018, 1, 5);
        expect(date.toDateString()).toEqual("Fri Jan 05 2018");
    });

    it('should be setup!', function () {
        expect(defaultSoundRole).not.toBeNull("are roles setup?")
    });

    it('can return people in a role', () => {
        let neil = new Person("neil");
        let daniel = new Person("daniel");

        let sd = new ScheduleAtDate(new Date(2000, 0, 0));
        let team = new Team("Scud Missile");
        team.add(neil);
        team.add(daniel);
        let plan = new Plan("test", team);

        let neil_assignment = plan.assignment_for(neil);
        let daniel_assignment = plan.assignment_for(daniel);

        /*
        intentionally have not added roles to neil, daniel at the Service level.
        shouldn't be required for this test
         */

        sd.add_person(neil_assignment, defaultSoundRole);
        expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);

        sd.add_person(daniel_assignment, defaultBass);
        expect(sd.people_in_role(defaultBass)).toEqual([daniel]);
    });

});