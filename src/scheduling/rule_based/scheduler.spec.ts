import {PeopleStore, Person} from "../../state/people";
import {ScheduleInput} from "../common";
import {defaultAccousticGuitar, defaultSoundRole, Role} from "../../state/roles";
import {ScheduleWithRules} from "./scheduler";
import {Availability, AvailabilityUnit} from "../../state/scheduling-types";
import includes from 'lodash/includes';

describe('role scheduler', () => {
    let person_store: PeopleStore;

    let neil: Person;
    let params: ScheduleInput;
    let end_date: Date;
    let start_date: Date;
    let sound: Role;
    let schedule: ScheduleWithRules;

    beforeAll(() => {
        start_date = new Date();
        end_date = new Date();
        end_date.setDate(start_date.getDate() + 30);
    });

    beforeEach(() => {
        person_store = new PeopleStore();

        params = new ScheduleInput(person_store);
        params.start_date = start_date;
        params.end_date = end_date;
        params.people = person_store;

        sound = params.roles.find_role("Sound");
        expect(sound).not.toBeNull();

        neil = new Person("Neil", "1234");
        neil.addRole(sound);
        person_store.addPerson(neil);
    });

    it('cannot create empty', () => {
        params.end_date = start_date;
        person_store.removePerson(neil);
        expect(() => {
            schedule = new ScheduleWithRules(params);
            schedule.create_schedule()
        }).toThrow();
    });

    it('can schedule neil weekly', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);
        neil.addRole(params.roles.find_role("Sound"));

        schedule = new ScheduleWithRules(params);
        expect(schedule).not.toBeNull();

        schedule.create_schedule();

        // expect to see neil on once per week, for N weeks.
        let dates_map = schedule.dates;
        expect(dates_map.size).toEqual(4);

        // expect to see dates 7 days apart
        let dates = Array.from(dates_map.keys());
        let first_schedule = dates_map.get(dates[0]);
        // console.log("All: " + JSON.stringify(dates));
        // console.log("First: " + JSON.stringify(first_schedule));
        expect(first_schedule.date.getDate()).toEqual(1);

        // Check it has a person
        let people = first_schedule.people;
        expect(people.length).toEqual(1);
        expect(people[0].name).toEqual("Neil");

        expect(dates_map.get(dates[1]).date.getDate()).toEqual(8);
        expect(dates_map.get(dates[2]).date.getDate()).toEqual(15);
        expect(dates_map.get(dates[3]).date.getDate()).toEqual(22);
    });

    it('exclusions affect the layout', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);
        neil.addRole(params.roles.find_role("Sound"));

        // Make myself available every 2 weeks, we should see a change to the schedule
        neil.prefs.availability = new Availability(2, AvailabilityUnit.EVERY_N_WEEKS);

        schedule = new ScheduleWithRules(params);
        expect(schedule).not.toBeNull();

        schedule.create_schedule();

        // Find the dates that have Neil doing something. Should be two.
        let all_scheduled = Array.from(schedule.dates.values());

        let dates_with_neil = all_scheduled.filter(sad => {
            console.log("Check " + JSON.stringify(sad.people));
            return includes(sad.people, neil);
        });
        expect(dates_with_neil.length).toEqual(2);
    });

    it('unavailable dates act like exclusion zones', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);
        neil.removeRole(sound);
        neil.prefs.availability = new Availability(2, AvailabilityUnit.EVERY_N_WEEKS);
        neil.addRole(params.roles.find_role("Computer"));

        // If unavailability affects exclusions we should end up with not being able to schedule on the first date
        neil.addUnavailable(params.start_date);

        schedule = new ScheduleWithRules(params);
        expect(schedule).not.toBeNull();
        schedule.create_schedule();

        let all_scheduled = Array.from(schedule.dates.values());
        let dates_with_neil = all_scheduled.filter(sad => {
            // console.log("Check: " + JSON.stringify(sad));
            return includes(sad.people, neil);
        });

        expect(dates_with_neil.length).toEqual(1);
        expect(dates_with_neil[0].date.getDate()).toEqual(8);
    });

    it('limits placements based on max count', () => {
        // One week
        params.start_date = new Date(2017, 10, 1);
        params.end_date = new Date(2017, 10, 3);

        // Put neil on Guitar
        // And daniel on guitar as well
        neil.removeRole(sound);
        neil.prefs.availability = new Availability(1, AvailabilityUnit.AVAIL_ANYTIME);
        neil.addRole(defaultAccousticGuitar);

        let daniel = new Person("Daniel");
        person_store.addPerson(daniel);
        daniel.addRole(defaultAccousticGuitar);

        defaultAccousticGuitar.maximum_count = 1;

        // Do a schedule. For one week.
        // We should see just ONE person on guitar.
        schedule = new ScheduleWithRules(params);
        schedule.create_schedule();

        let firstSchedule = Array.from(schedule.dates.values())[0];
        expect(firstSchedule).not.toBeNull();
        expect(firstSchedule.people_in_role(defaultAccousticGuitar).length).toBe(1);
        // console.log(schedule.jsonResult());
    });

    it('distributes among roles evenly', () => {
        // Make a 6 day schedule with 3 people, all available every day.
        // Expect to see a rotation, rather than the first person picked all the time
        params.start_date = new Date(2017, 10, 1);
        params.end_date = new Date(2017, 10, 6);
        params.days_per_period = 1;

        let daniel = new Person("Daniel");
        person_store.addPerson(daniel);
        daniel.addRole(defaultSoundRole);

        let ben = new Person("Ben");
        person_store.addPerson(ben);
        ben.addRole(defaultSoundRole);

        schedule = new ScheduleWithRules(params);
        schedule.create_schedule();
        let schedules = Array.from(schedule.dates.values());

        // console.log(schedule.jsonResult(true));

        expect(schedules[0].people_in_role(defaultSoundRole)[0].name).toEqual("Neil");
        expect(schedules[1].people_in_role(defaultSoundRole)[0].name).toEqual("Daniel");
        expect(schedules[2].people_in_role(defaultSoundRole)[0].name).toEqual("Ben");
        expect(schedules[3].people_in_role(defaultSoundRole)[0].name).toEqual("Neil");
        expect(schedules[4].people_in_role(defaultSoundRole)[0].name).toEqual("Daniel");
    });
});