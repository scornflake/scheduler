import {PeopleStore, Person, Unavailablity} from "../state/people";
import {SchedulePrefs} from "../state/scheduling-types";
import {Role, RolesStore} from "../state/roles";

// Score for this person, for some date
export class ScheduleScore {
    role: Role;
    layout_weight: number;
    roster_weight: number;
    score: number;

    constructor(r: Role) {
        this.role = r;
    }
}

export class ScheduleInput {
    start_date: Date;
    end_date: Date;
    days_per_period: number;

    roles: RolesStore;
    people: PeopleStore;
    settings: SchedulePrefs;

    constructor(people: PeopleStore = new PeopleStore(), roles: RolesStore = new RolesStore()) {
        this.days_per_period = 7;
        this.people = people;
        this.roles = roles;
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

    get people_sorted_by_role_priority(): Array<Person> {
        let people = this.people;
        return people.sort((a: Person, b: Person) => {
            if (a.highest_role_layout_priority > b.highest_role_layout_priority) {
                return 1;
            } else if (a.highest_role_layout_priority < b.highest_role_layout_priority) {
                return -1;
            }
            return 0;
        });
    }

    add_person(person: Person, role: Role) {
        let score = new ScheduleScore(role);
        console.log("Schedule " + person.name + " for " + role.name + " on " + this.date);
        this.people_score.set(person, score);
    }

    people_in_role(role: Role): Array<Person> {
        return this.people.filter(p => {
            let score = this.people_score.get(p);
            return score.role.uuid == role.uuid;
        });
    }
}

function dayMonthYear(date: Date): string {
    return date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
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
        return this.start_date <= date && date < this.end_date;
    }

    get duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }
}

export class ScheduleByExclusion {
    role_index: Map<Role, number>;
    dates: Map<string, ScheduleAtDate>;
    exclusion_zones: Map<Person, Array<Exclusion>>;

    private params: ScheduleInput;

    constructor(params: ScheduleInput) {
        this.role_index = new Map<Role, number>();
        this.params = params;
        this.dates = new Map<string, ScheduleAtDate>();
        this.exclusion_zones = new Map<Person, Array<Exclusion>>();

        if (params.roles.roles_in_layout_order.length == 0) {
            throw Error("The dates parameters don't define any roles.");
        }

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
        let dateAtHour = Unavailablity.dayAndHourForDate(date);
        let schedule = this.dates.get(dateAtHour);
        if (schedule == null) {
            console.log("Create new schedule for " + dateAtHour);
            schedule = new ScheduleAtDate(date);
            this.dates.set(dateAtHour, schedule);
            return schedule;
        } else {
            console.log("Reuse schedule for " + dateAtHour + " = " + date);
            return schedule;
        }
    }

    public create_schedule() {
        console.log("Working from " + this.params.start_date + " to: " + this.params.end_date);
        let schedule_duration = this.schedule_duration_in_days;
        console.log("Schedule is " + schedule_duration + " days long");

        let iterations = 0;

        // Work through all roles first, by date.
        let roles_store = this.params.roles;
        let people_store = this.params.people;
        let roles = roles_store.roles_in_layout_order;
        let role_names = roles.map(r => r.name);
        console.log("Roles (in order of importance): " + JSON.stringify(role_names));

        for (let role of roles) {
            let current_date = this.params.start_date;
            console.log("");

            let people_for_this_role = people_store.people_with_role(role);
            // Setup our available people (which at the beginning, is 'everyone')
            if (people_for_this_role.length == 0) {
                console.log("Laying out role: " + role.name + " ... skipping (no one to do it)");
                continue;
            }
            console.log("Laying out role: " + role.name);

            console.log("Considering: " + JSON.stringify(people_for_this_role.map(p => {
                return p.name;
            })));

            // Iterate through all dates
            while (current_date.valueOf() < this.params.end_date.valueOf()) {
                console.log("Next date: " + current_date);

                // Iterate all the people, but do so from the last used index.
                // This is so we give everyone who can do that role the chance.
                for (let person_index = 0; person_index < people_for_this_role.length; person_index++) {
                    let last_role_index = this.role_index.get(role);
                    if (last_role_index === undefined) {
                        last_role_index = 0;
                    }
                    let actulal_index = person_index + last_role_index;
                    actulal_index = actulal_index % people_for_this_role.length;

                    let person = people_for_this_role[actulal_index];

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

                    // record that we used this index
                    this.role_index.set(role, actulal_index + 1);

                    // OK. Have we reached the max?
                    let peopleInRole = specific_day.people_in_role(role);
                    let names = peopleInRole.map(r => {
                        return r.name
                    });
                    console.log("People in role: " + role.name + " (max:" + role.maximum_count + ") = " + names);
                    if (peopleInRole.length >= role.maximum_count) {
                        // Done. We can move on.
                        break;
                    }
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
        // Is this person unavailable on this date?
        if (person.is_unavailable_on(date)) {
            return true;
        }

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

    jsonResult(minimized: boolean = false) {
        // An array of dictionaries
        // Each dict is ordered keys, being in order of the role

        // These 'people' end up being our roles.
        // Thing is, we want to know ALL people, in order...
        // So I think - lets do this for ALL roles first
        let ordered_roles = this.params.roles.roles_in_layout_order;

        let rows = [];
        for (let dateString of Array.from(this.dates.keys())) {
            let schedule_for_day = this.dates.get(dateString);

            // We create a dict, in order, for EVERY key of ordered_roles
            let rowDict = {};

            rowDict['date'] = dateString;

            // Look at each known role. Fill in the people fulfilling that role
            for (let role of ordered_roles) {
                // Do we have a value, for this?
                let value = null;
                let peopleInRole = schedule_for_day.people_in_role(role);
                if (peopleInRole.length > 0) {
                    let names = peopleInRole.map(r => {
                        return r.name
                    });
                    rowDict[role.name] = names.join(",");
                } else {
                    if (!minimized) {
                        rowDict[role.name] = "";
                    }
                }
            }

            // Add the row
            rows.push(rowDict);
        }
        return rows;
    }

    jsonFields() {
        let ordered_roles = this.params.roles.roles_in_layout_order;
        let field_names = ordered_roles.map(r => {
            return r.name;
        });
        return [
            "date",
            ...field_names
        ]
    }
}

