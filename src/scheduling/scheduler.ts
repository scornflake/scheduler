import {IAllPersons, IPerson} from "../state/reducers/people";

// Want to represent X people doing tasks Xy for week/time W
// This is to represent
interface IScheduleTasks {
    label: string;
    person: IPerson;
}

export interface IScheduledPeople {
    start_date: Date;
    end_date: Date;

    tasks: IScheduleTasks[];
    all_people: IPerson[];
}

export class PeopleScheduler {
    period_in_days_between_steps: number = 7;

    private schedule: IScheduledPeople;

    public CreateSchedule(people: IAllPersons, start_date: Date, end_date: Date): IScheduledPeople {
        this.schedule = {
            start_date: start_date,
            end_date: end_date,

            tasks: [],
            all_people: []
        };

        this.schedule.tasks = this.create_tasks_for_dates();

        return this.schedule;
    }

    private create_tasks_for_dates(): IScheduleTasks[] {
        let date = this.schedule.start_date;
        while (date <= this.schedule.end_date) {

            date = this.choose_next_schedule_date(date);
        }
        return [];
    }

    private choose_next_schedule_date(date: Date): Date {
        return new Date(date.getDate() + this.period_in_days_between_steps);
    }
}

