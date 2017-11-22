///<reference path="../../node_modules/@types/jasmine-expect/index.d.ts"/>
import {PeopleStore, Person} from "../state/reducers/people";
import {PeopleScheduler} from "./scheduler";

describe('schedule', () => {
    let person_store: PeopleStore;

    let neil: Person;
    let end_date: Date = new Date();
    let start_date: Date = new Date();
    let scheduler: PeopleScheduler = new PeopleScheduler();

    beforeEach(() => {
        person_store = new PeopleStore();
        neil = new Person("1234", "Neil");
        end_date.setDate(Date.now() + 60);
        scheduler.period_in_days_between_steps = 7;
    });

    it('can create empty', () => {
        let schedule = scheduler.CreateSchedule(person_store, start_date, end_date);
        expect(schedule).not.toBeNull();
        expect(schedule.tasks).toBeEmptyArray();
    });

    xit('can schedule neil weekly', () => {
        person_store.addPerson(neil);

        let schedule = scheduler.CreateSchedule(person_store, start_date, end_date);
        expect(schedule).not.toBeNull();
        expect(schedule.tasks.length).not.toEqual(0);


    })
});