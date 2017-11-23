import {PeopleStore, Person} from "../state/people";
import {SchedulePrefs} from "../state/scheduling";
import {Role, RolesStore} from "../state/roles";

// Score for this person, for some date
export class ScheduleScore {
    layout_weight: number;
    roster_weight: number;
    score: number;
}

export class ScheduleInput {
    start_date: Date;
    end_date: Date;
    days_per_period: number;

    roles: RolesStore;
    people: PeopleStore;
    settings: SchedulePrefs;

    constructor() {
        this.days_per_period = 7;
        this.people = new PeopleStore();
        this.settings = new SchedulePrefs();
    }
}

// Want to represent X people doing schedule Xy for some date
class ScheduleAtDate {
    date: Date;
    people_score: Map<Person, ScheduleScore>;

    constructor() {
        this.people_score = new Map<Person, ScheduleScore>();
    }

    schedule_for(p: Person) {
        return this.people_score.get(p);
    }

    get people(): Array<Person> {
        return Array.from(this.people_score.keys());
    }
}

function daysBetween(startDate: Date, endDate: Date): number {
    let msPerDay = 1000 * 60 * 60 * 24;
    return (endDate.valueOf() - startDate.valueOf()) / msPerDay;
}

export class ScheduledPeople {
    start_date: Date;
    end_date: Date;
    period_in_days_between_steps: number;

    schedule: ScheduleAtDate[];

    constructor(params: ScheduleInput) {
        this.start_date = params.start_date;
        this.end_date = params.end_date;
        this.period_in_days_between_steps = params.days_per_period;
        this.schedule = [];

        if (this.period_in_days_between_steps < 1) {
            throw new Error("Period must be > 1");
        }

        if (!this.start_date || isNaN(this.start_date.valueOf())) {
            throw new Error("No start date, or start date is invalid");
        }
        if (!this.end_date || isNaN(this.end_date.valueOf())) {
            throw new Error("No end date, or end date is invalid");
        }

        if (this.schedule_duration_in_days <= 0) {
            throw new Error("The schedule has no sensible length (0 or -ve)");
        }
    }

    get schedule_duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }
}


export class PeopleScheduler {
    private schedule: ScheduledPeople;
    private params: ScheduleInput;

    public static defaultPreferences(): SchedulePrefs {
        return new SchedulePrefs();
    }

    public CreateSchedule(params: ScheduleInput): ScheduledPeople {
        this.params = params;

        if (params.roles.roles_in_layout_order.length == 0) {
            throw Error("The schedule parameters don't define any roles.");
        }

        this.schedule = new ScheduledPeople(params);
        this.schedule.schedule = this.create_tasks_for_dates();
        return this.schedule;
    }

    private create_tasks_for_dates(): Array<ScheduleAtDate> {
        console.log("Creating schedule from " + this.params.start_date + " to: " + this.params.end_date);
        let schedule_duration = this.schedule.schedule_duration_in_days;
        console.log("Schedule is " + schedule_duration + " days long");
        let solutions = [];

        let iterations = 0;

        // Work through all roles first, by date.
        let roles = this.params.roles.roles_in_layout_order;
        for (let role of roles) {
            let current_date = this.params.start_date;
            console.log("Laying out role: " + role.name);

            // Iterate through all dates
            while (current_date.valueOf() <= this.params.end_date.valueOf()) {
                console.log("Creating schedule for: " + current_date + " end: " + this.params.end_date);
                let schedule = this.create_schedule_for_date(current_date);
                solutions.push(schedule);

                current_date = this.choose_next_schedule_date(current_date);

                // This is taking 10,000 reasons too far!
                iterations++;
                if (iterations > 10000) {
                    console.error("Max iterations - bug!?");
                    break
                }
            }

        }
        return solutions;
    }

    private choose_next_schedule_date(date: Date): Date {
        let next_date = new Date(date);
        // console.log("Moving from date ... : " + next_date);
        next_date.setDate(date.getDate() + this.schedule.period_in_days_between_steps);
        // console.log(".... to date ... : " + next_date);
        return next_date;
    }

    private create_schedule_for_date(date: Date) {
        let schedule = new ScheduleAtDate();
        schedule.date = date;

        let roles = this.params.roles.roles_in_layout_order;


        return schedule;
    }
}

