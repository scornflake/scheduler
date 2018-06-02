import {Role} from "../role";

import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../availability";
import includes from 'lodash/includes';
import {CSVExporter} from "../exporter/csv.exporter";
import {addDaysToDate, constructSensibleDate} from "../common/date-utils";
import {SafeJSON} from "../../common/json/safe-stringify";
import {Person} from "../people";
import {
    defaultAcousticGuitar,
    defaultComputerRole,
    defaultSaxRole,
    defaultSoundRole,
    defaultSpeakerRole,
    defaultThemeRole, SetupDefaultRoles
} from "../tests/sample-data";
import {ScheduleWithRules} from "./scheduler";
import {Service} from "../service";
import {Team} from "../teams";

describe('role scheduler', () => {
    let team:Team;
    let neil: Person, daniel: Person;
    let service: Service;
    let end_date: Date;
    let start_date: Date;
    let sound: Role;
    let schedule: ScheduleWithRules;

    beforeEach(() => {
        SetupDefaultRoles();

        start_date = new Date();
        end_date = new Date();
        end_date.setDate(start_date.getDate() + 30);

        daniel = new Person("Daniel");
        neil = new Person("Neil");

        team = new Team("Foo Scud");
        team.add_person(neil);
        team.add_person(daniel);

        service = new Service("role schedule test service", team);
        service.start_date = start_date;
        service.end_date = end_date;

        service.add_role(defaultSoundRole);
        service.add_role(defaultComputerRole);
        service.add_role(defaultAcousticGuitar);
        service.assignment_for(neil).add_role(defaultSoundRole);

        // Roles on a service are derived from the people in the service
        sound = service.find_role("Sound");
        expect(sound).not.toBeNull();
    });

    it('cannot create empty', () => {
        service.end_date = start_date;
        service.remove_person(neil);
        expect(() => {
            schedule = new ScheduleWithRules(service);
            schedule.create_schedule()
        }).toThrow();
    });

    it('can schedule neil weekly', () => {
        service.start_date = new Date(2017, 9, 1);
        service.end_date = new Date(2017, 9, 25);

        schedule = new ScheduleWithRules(service);
        expect(schedule).not.toBeNull();

        schedule.create_schedule();

        // expect to see neil on once per week, for N weeks.
        let dates = schedule.dates;
        expect(dates.length).toEqual(4);

        // expect to see dates 7 days apart
        let first_schedule = dates[0];
        // console.log("All: " + SafeJSON.stringify(dates));
        // console.log("First: " + SafeJSON.stringify(first_schedule));
        expect(first_schedule.date.getDate()).toEqual(1);

        // Check it has a person
        let people = first_schedule.people;
        expect(people.length).toEqual(1);
        expect(people[0].name).toEqual("Neil");

        expect(dates[1].date.getDate()).toEqual(8);
        expect(dates[2].date.getDate()).toEqual(15);
        expect(dates[3].date.getDate()).toEqual(22);
    });

    it('exclusions affect the layout', () => {
        service.start_date = new Date(2017, 9, 1);
        service.end_date = new Date(2017, 9, 25);

        // Make myself available every 2 weeks, we should see a change to the schedule
        neil.prefs.availability = new Availability(2, AvailabilityUnit.EVERY_N_WEEKS);

        schedule = new ScheduleWithRules(service);
        expect(schedule).not.toBeNull();

        schedule.create_schedule();

        // Find the dates that have Neil doing something. Should be two.
        let all_scheduled = Array.from(schedule.dates.values());

        let dates_with_neil = all_scheduled.filter(sad => {
            return includes(sad.people, neil);
        });
        expect(dates_with_neil.length).toEqual(2);
    });

    it('should be able to schedule 2 out of 3 weeks', function () {
        /*
        This builds a schedule where neil is on every 2 of 3 weeks.
         */
        neil.set_availability(new AvailabilityEveryNOfM(2, 3));

        schedule = new ScheduleWithRules(service);
        expect(schedule).not.toBeNull();
        schedule.create_schedule();

        console.log("Schedule: " + new CSVExporter(schedule));
    });

    it('should be test for 2 out of 3 weeks availability', function () {
        /*
        This builds a schedule where neil is on every week.
        We can then test the schedule.is_person_available method
         */
        schedule = new ScheduleWithRules(service);
        expect(schedule).not.toBeNull();
        schedule.create_schedule();
        let facts = schedule.facts;

        /*
        Only change neil AFTER the schedule is built. Since we don't want
        the availability to affect the building of the schedule in this test
         */
        neil.set_availability(new AvailabilityEveryNOfM(2, 3));

        console.log("Schedule: " + new CSVExporter(schedule));

        console.log(`Test1: ${start_date.toDateString()}`);
        expect(facts.is_person_available(neil, start_date)).toBeTruthy();

        /*
        The reason this 2nd and 3rd tests should be false is that we are testing an EXISTING
        schedule. At runtime, the counts will be N-1 (so, 2 would pass) because the person hasn't
        been added to the role for the date in question. However; in this test, they already have.
         */
        let next_date = addDaysToDate(start_date, 7);
        console.log(`Test2: ${next_date.toDateString()}`);
        expect(facts.is_person_available(neil, next_date)).toBeFalsy();

        next_date = addDaysToDate(start_date, 14);
        console.log(`Test3: ${next_date.toDateString()}`);
        expect(facts.is_person_available(neil, next_date)).toBeFalsy();

    });

    it('unavailable dates act like exclusion zones', () => {
        service.start_date = new Date(2017, 9, 1);
        service.end_date = new Date(2017, 9, 25);

        service.assignment_for(neil).remove_role(sound).add_role(defaultComputerRole);
        neil.prefs.availability = new Availability(2, AvailabilityUnit.EVERY_N_WEEKS);

        // If unavailability affects exclusions we should end up with not being able to schedule on the first date
        neil.add_unavailable(service.start_date);

        schedule = new ScheduleWithRules(service);
        expect(schedule).not.toBeNull();
        schedule.create_schedule();

        let all_scheduled = Array.from(schedule.dates.values());
        // console.log("ALL: " + SafeJSON.stringify(all_scheduled));
        let dates_with_neil = all_scheduled.filter(sad => {
            console.log("Check: " + SafeJSON.stringify(sad));
            return includes(sad.people, neil);
        });

        expect(dates_with_neil.length).toEqual(2);
        expect(dates_with_neil[0].date.getDate()).toEqual(8);
        expect(dates_with_neil[1].date.getDate()).toEqual(22);
    });

    it('limits placements based on max count', () => {
        // One week
        service.start_date = new Date(2017, 10, 1);
        service.end_date = new Date(2017, 10, 3);

        // Put neil on Guitar, and daniel on guitar as well
        // Should see that the maximum number of placements in 'guitar' is one, not two.
        service.assignment_for(neil).remove_role(sound).add_role(defaultAcousticGuitar);
        neil.prefs.availability = new Availability(1, AvailabilityUnit.AVAIL_ANYTIME);

        service.assignment_for(daniel).add_role(defaultAcousticGuitar);

        // Do a schedule. For one week.
        // We should see just ONE person on guitar.
        schedule = new ScheduleWithRules(service);
        schedule.create_schedule();

        let firstSchedule = Array.from(schedule.dates.values())[0];
        expect(firstSchedule).not.toBeNull();
        expect(firstSchedule.people_in_role(defaultAcousticGuitar).length).toBe(1);
        console.log(schedule.jsonResult());
    });

    it('distributes among roles evenly', () => {
        // Make a 6 day schedule with 3 people, all available every day.
        // Expect to see a rotation, rather than the first person picked all the time
        service.start_date = new Date(2017, 10, 1);
        service.end_date = new Date(2017, 10, 6);
        service.days_per_period = 1;

        let ben = new Person("Ben");
        team.add_person(ben);

        service.assignment_for(daniel).add_role(defaultSoundRole);
        service.assignment_for(ben).add_role(defaultSoundRole);

        schedule = new ScheduleWithRules(service);
        schedule.create_schedule();
        let schedules = Array.from(schedule.dates.values());

        // console.log(schedule.jsonResult(true));

        schedule.dates.forEach(sc => {
            console.log("" + sc);
        });

        expect(schedules[0].people_in_role(defaultSoundRole)[0].name).toEqual("Neil");
        expect(schedules[1].people_in_role(defaultSoundRole)[0].name).toEqual("Daniel");
        expect(schedules[2].people_in_role(defaultSoundRole)[0].name).toEqual("Ben");
        expect(schedules[3].people_in_role(defaultSoundRole)[0].name).toEqual("Neil");
        expect(schedules[4].people_in_role(defaultSoundRole)[0].name).toEqual("Daniel");
    });

    describe('notes', () => {
        it('can record free text for a role position', function () {
            schedule = new ScheduleWithRules(service);
            let date = constructSensibleDate(2018, 1, 5);

            schedule.add_note(date, defaultSpeakerRole, "Hello");
            schedule.add_note(date, defaultThemeRole, "Coding");

            expect(schedule.notes_for_date(date, defaultSpeakerRole)).toEqual(["Hello"]);
            expect(schedule.notes_for_date(date, defaultThemeRole)).toEqual(["Coding"]);
            expect(schedule.notes_for_date(date, defaultSaxRole)).toEqual([]);
        });
    });
});