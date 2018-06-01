import {ScheduleAtDate} from "../shared";
import {Person} from "../people";
import {defaultBass, defaultSoundRole} from "../tests/sample-data";
import {constructSensibleDate} from "../common/date-utils";
import {Service} from "../service";

describe('schedule', () => {
    it('should be able to construct non retarded dates', function () {
        // For some bizarre reason 'month' starts at zero. Day doesn't. NICE one.
        let date = constructSensibleDate(2018, 1, 5);
        expect(date.toDateString()).toEqual("Fri Jan 05 2018");
    });

    it('can return people in a role', () => {
        let neil = new Person("neil");
        let daniel = new Person("daniel");

        let sd = new ScheduleAtDate(new Date(2000, 0, 0));
        let service = new Service("test");

        let neil_assignment = service.add_person(neil);
        let daniel_assignment = service.add_person(daniel);

        /*
        intentionally havn't added roles to neil,daniel at the Service level.
        shouldn't be required for this test
         */

        sd.add_person(neil_assignment, defaultSoundRole);
        expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);

        sd.add_person(daniel_assignment, defaultBass);
        expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);
        expect(sd.people_in_role(defaultBass)).toEqual([daniel]);
    });

});