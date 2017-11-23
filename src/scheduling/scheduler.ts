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

// Want to represent X people doing dates Xy for some date
class ScheduleAtDate {
    date: Date;
    people_score: Map<Person, ScheduleScore>;

    constructor(date: Date) {
        this.date = date;
        this.people_score = new Map<Person, ScheduleScore>();
    }

    score_for(p: Person) {
        return this.people_score.get(p);
    }

    get people(): Array<Person> {
        return Array.from(this.people_score.keys());
    }

    add_person(person: Person, role: Role) {
        let score = new ScheduleScore();
        console.log("Schedule " + person.name + " for " + role.name + " on " + this.date);
        this.people_score.set(person, score);
    }
}

function daysBetween(startDate: Date, endDate: Date): number {
    let msPerDay = 1000 * 60 * 60 * 24;
    return (endDate.valueOf() - startDate.valueOf()) / msPerDay;
}

export class Exclusion {
    start_date: Date;
    end_date: Date;
    caused_by: string;

    constructor(start: Date, end: Date, cause: string) {
        this.start_date = start;
        this.end_date = end;
        if (this.duration_in_days < 0) {
            throw Error("Cannot have an exclusion zone with a -ve duration");
        }
        this.caused_by = cause;
    }

    includes_date(date: Date) {
        return this.start_date <= date && date <= this.end_date;
    }

    get duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }
}

export class ScheduledPeople {
    dates: Map<Date, ScheduleAtDate>;
    exclusion_zones: Map<Person, Array<Exclusion>>;

    private params: ScheduleInput;

    constructor(params: ScheduleInput) {
        this.params = params;
        this.dates = new Map<Date, ScheduleAtDate>();
        this.exclusion_zones = new Map<Person, Array<Exclusion>>();

        if (this.days_per_period < 1) {
            throw new Error("Period must be > 1");
        }

        if (!this.start_date || isNaN(this.start_date.valueOf())) {
            throw new Error("No start date, or start date is invalid");
        }
        if (!this.end_date || isNaN(this.end_date.valueOf())) {
            throw new Error("No end date, or end date is invalid");
        }

        if (this.schedule_duration_in_days <= 0) {
            throw new Error("The dates has no sensible length (0 or -ve)");
        }
    }

    get start_date(): Date {
        return this.params.start_date;
    }

    get end_date(): Date {
        return this.params.end_date;
    }

    get days_per_period(): number {
        return this.params.days_per_period;
    }

    get schedule_duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }

    get_schedule_for_date(date: Date) {
        let schedule = this.dates.get(date);
        if (schedule == null) {
            // console.log("Create new schedule for " + date);
            schedule = new ScheduleAtDate(date);
            this.dates.set(new Date(date), schedule);
            return schedule;
        } else {
            // console.log("Reuse schedule for " + date);
            return schedule;
        }
    }

    create_schedule() {
        console.log("Working from " + this.params.start_date + " to: " + this.params.end_date);
        let schedule_duration = this.schedule_duration_in_days;
        console.log("Schedule is " + schedule_duration + " days long");

        let iterations = 0;

        // Work through all roles first, by date.
        let roles_store = this.params.roles;
        let people_store = this.params.people;

        let roles = roles_store.roles_in_layout_order;
        for (let role of roles) {
            let current_date = this.params.start_date;
            console.log("Laying out role: " + role.name);

            // Setup our available people (which at the beginning, is 'everyone')
            let people_for_this_role = people_store.people_with_role(role);
            if (people_for_this_role.length == 0) {
                console.log("Skipping role, there's no one that can do it");
                continue;
            }
            console.log("Considering: " + JSON.stringify(people_for_this_role.map(p => {
                return p.name;
            })));

            // Iterate through all dates
            while (current_date.valueOf() <= this.params.end_date.valueOf()) {
                console.log("Examining: " + current_date);
                for (let person of people_for_this_role) {
                    if (this.has_exclusion_for(current_date, person, role)) {
                        continue;
                    }

                    // ok. We can put someone in this slot then.
                    let specific_day = this.get_schedule_for_date(current_date);
                    if (!specific_day) {
                        throw Error("What? Unable to get a schedule for " + current_date);
                    }
                    specific_day.add_person(person, role);
                    this.record_exclusions(current_date, person, role);
                }

                // Move to the next date
                current_date = this.choose_next_schedule_date(current_date);

                // This is taking 10,000 reasons too far!
                iterations++;
                if (iterations > 10000) {
                    console.error("Max iterations - bug!?");
                    break
                }
            }

        }
    }

    private choose_next_schedule_date(date: Date): Date {
        let next_date = new Date(date);
        // console.log("Moving from date ... : " + next_date);
        next_date.setDate(date.getDate() + this.days_per_period);
        // console.log(".... to date ... : " + next_date);
        return next_date;
    }

    private has_exclusion_for(date: Date, person: Person, role: Role) {
        // Is this person excluded for this date?
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            return false;
        }
        for (let exclusion of exclusions_for_person) {
            if (exclusion.includes_date(date)) {
                return true;
            }
        }
        return false;
    }

    private record_exclusions(date: Date, person: Person, role: Role) {
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            exclusions_for_person = [];
        }

        // make the exclusion
        let availability = person.prefs.availability;

        let end_date = availability.get_end_date_from(date);
        let exclusion = new Exclusion(date, end_date, "scheduled for " + role.name);
        exclusions_for_person.push(exclusion);
        console.log("Recorded exclusion for " + person.name + " from " + date + " for " + exclusion.duration_in_days + " days");
        this.exclusion_zones.set(person, exclusions_for_person);
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
            throw Error("The dates parameters don't define any roles.");
        }

        this.schedule = new ScheduledPeople(params);
        this.schedule.create_schedule();
        return this.schedule;
    }
}

