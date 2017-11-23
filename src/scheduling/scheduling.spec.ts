///<reference path="../../node_modules/@types/jasmine-expect/index.d.ts"/>
import {PeopleStore, Person} from "../state/people";
import {PeopleScheduler, ScheduleInput} from "./scheduler";
import {Role, RolesStore} from "../state/roles";

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

    it('can schedule neil weekly', () => {
        params.start_date = new Date(2017, 9, 1);
        params.end_date = new Date(2017, 9, 25);

        neil.addRole(params.roles.find_role("Sound"));
        person_store.addPerson(neil);

        let schedule = scheduler.CreateSchedule(params);
        expect(schedule).not.toBeNull();

        // expect to see neil on once per week, for N weeks.
        let actual = schedule.schedule;
        expect(actual.length).toEqual(4);

        // expect to see schedule 7 days apart
        // console.log("Actual: " + JSON.stringify(actual));
        expect(actual[0].date.getDate()).toEqual(1);

        // Check it has a person
        let people = actual[0].people;
        expect(people.length).toEqual(1);
        expect(people[0].name).toEqual("Neil");

        expect(actual[1].date.getDate()).toEqual(8);
        expect(actual[2].date.getDate()).toEqual(15);
        expect(actual[3].date.getDate()).toEqual(22);
    });


});