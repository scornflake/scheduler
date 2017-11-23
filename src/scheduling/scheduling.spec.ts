///<reference path="../../node_modules/@types/jasmine-expect/index.d.ts"/>
import {PeopleStore, Person} from "../state/people";
import {PeopleScheduler, ScheduleInput} from "./scheduler";
import {Role, RolesStore} from "../state/roles";
import {Availability, AvailabilityUnit} from "../state/scheduling";
import includes from 'lodash/includes';

describe('schedule', () => {
    let person_store: PeopleStore;

    let neil: Person;
    let params: ScheduleInput;
    let end_date: Date;
    let start_date: Date;
    let scheduler: PeopleScheduler = new PeopleScheduler();

    beforeAll(() => {
        start_date = new Date();
        end_date = new Date();
        end_date.setDate(start_date.getDate() + 30);
    });

    beforeEach(() => {
        person_store = new PeopleStore();

        params = new ScheduleInput();
        params.start_date = start_date;
        params.end_date = end_date;
        params.roles = new RolesStore();
        params.people = person_store;

        let sound: Role = params.roles.find_role("Sound");
        expect(sound).not.toBeNull();
        neil = new Person("1234", "Neil");
        neil.addRole(sound);
    });

    it('cannot create empty', () => {
        params.end_date = start_date;
        expect(() => {
            scheduler.CreateSchedule(params)
        }).toThrow();
    });

    it('can dates neil weekly', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);
        neil.addRole(params.roles.find_role("Sound"));
        person_store.addPerson(neil);

        let schedule = scheduler.CreateSchedule(params);
        expect(schedule).not.toBeNull();
        // console.log("Ended up with " + schedule.dates.size + " dates");

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

    xit('unavailable dates are turned into day long exclusion zones', () => {

    });

    it('exclusions affect the layout', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);
        neil.addRole(params.roles.find_role("Sound"));

        // Make myself available every 2 weeks, we should see a change to the schedule
        neil.prefs.availability = new Availability(2, AvailabilityUnit.AVAIL_WEEKS);
        person_store.addPerson(neil);

        let schedule = scheduler.CreateSchedule(params);
        expect(schedule).not.toBeNull();

        // Find the dates that have Neil doing something. Should be two.
        let all_scheduled = Array.from(schedule.dates.values());
        // console.log("All scheduled: " + JSON.stringify(all_scheduled));

        let dates_with_neil = all_scheduled.filter(sad => {
            console.log("Check " + JSON.stringify(sad.people));
            return includes(sad.people, neil);
        });
        expect(dates_with_neil.length).toEqual(2);
    });

});