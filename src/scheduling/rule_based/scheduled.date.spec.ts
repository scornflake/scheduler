import {ScheduleAtDate} from "../common";
import {Person} from "../../state/people";
import {defaultBass, defaultSoundRole} from "../../state/roles";

describe('schedule', () => {
    it('can return people in a role', () => {
        let neil = new Person("neil");
        let daniel = new Person("daniel");

        let sd = new ScheduleAtDate(new Date(2000, 0, 0));
        sd.add_person(neil, defaultSoundRole);
        expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);

        sd.add_person(daniel, defaultBass);
        expect(sd.people_in_role(defaultSoundRole)).toEqual([neil]);
        expect(sd.people_in_role(defaultBass)).toEqual([daniel]);
    });

});