///<reference path="../../node_modules/@types/jasmine-expect/index.d.ts"/>
import {emptyPerson, IAllPersons, IPerson} from "../state/reducers/people";
import {PeopleScheduler} from "./scheduler";

describe('schedule', () => {
    let everyone: IAllPersons;

    let neil: IPerson = emptyPerson;
    let end_date: Date = new Date();
    let start_date: Date = new Date();
    let scheduler: PeopleScheduler = new PeopleScheduler();

    beforeEach(() => {
        everyone = new Map<string, IPerson>();
        neil.uuid = '1234';
        neil.name = 'Neil';

        end_date.setDate(Date.now() + 60);
        scheduler.period_in_days_between_steps = 7;
    });

    it('can create empty', () => {
        let schedule = scheduler.CreateSchedule(everyone, start_date, end_date);
        expect(schedule).not.toBeNull();
        expect(schedule.tasks).toBeEmptyArray();
    });

    xit('can schedule neil weekly', () => {
        everyone[neil.uuid] = neil;

        let schedule = scheduler.CreateSchedule(everyone, start_date, end_date);
        expect(schedule).not.toBeNull();
        expect(schedule.tasks).not.toBeEmptyArray();


    })
});