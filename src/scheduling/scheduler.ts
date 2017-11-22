import {IAllPersons, PeopleStore, Person} from "../state/reducers/people";

// Want to represent X people doing tasks Xy for week/time W
// This is to represent
class ScheduleTask {
    label: string;
    person: Person;
}

export class ScheduledPeople {
    start_date: Date;
    end_date: Date;

    tasks: ScheduleTask[];
    all_people: Person[];
}

export class PeopleScheduler {
    period_in_days_between_steps: number = 7;

    private schedule: ScheduledPeople;

    public CreateSchedule(people: PeopleStore, start_date: Date, end_date: Date): ScheduledPeople {
        this.schedule = {
            start_date: start_date,
            end_date: end_date,

            tasks: [],
            all_people: []
        };

        this.schedule.tasks = this.create_tasks_for_dates();

        return this.schedule;
    }

    private create_tasks_for_dates(): ScheduleTask[] {
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

