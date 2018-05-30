import {Role} from "./role";
import {PeopleStore, Person} from "./people";
import * as _ from 'lodash';
import {dayAndHourForDate} from "./common/date-utils";
import {RolesStore} from "./tests/role-store";

class ObjectValidation {
    errors: string[] = new Array<string>();
    warnings: string[] = new Array<string>();
    ok: boolean = true;

    public add_error(e: string) {
        this.errors.push(e);
        this.ok = false;
    }

    public add_warning(e: string) {
        this.warnings.push(e);
    }
}

class ScheduleScore {
    person?: Person;
    roles: Array<Role>;
    decisions: Array<string>;
    score: number;

    constructor(role: Role) {
        this.roles = [role];
        this.score = 0;
        this.decisions = [];
    }

    has_role(role: Role) {
        return _.includes(this.roles, role);
    }

    valueOf() {
        return "Score: " + this.score + " for role: " + this.roles.join(", ");
    }

    add_role(role: Role) {
        this.roles.push(role);
    }
}

class ScheduleInput {
    start_date: Date;
    end_date: Date;
    days_per_period: number;

    roles: RolesStore;
    people: PeopleStore;

    manual_layouts: Map<Date, Role>;

    constructor(people: PeopleStore = new PeopleStore(), roles: RolesStore = new RolesStore()) {
        this.manual_layouts = new Map<Date, Role>();
        this.days_per_period = 7;
        this.people = people;
        this.roles = roles;
    }

    validate() {
        if (this.roles.roles_in_layout_order.length == 0) {
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

    get schedule_duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }

}

function daysBetween(startDate: Date, endDate: Date): number {
    let msPerDay = 1000 * 60 * 60 * 24;
    return (endDate.valueOf() - startDate.valueOf()) / msPerDay;
}

class Exclusion {
    start_date: Date;
    end_date: Date;
    role: Role;

    constructor(start: Date, end: Date, because: Role) {
        this.start_date = start;
        this.end_date = end;
        this.role = because;
        if (this.duration_in_days < 0) {
            throw Error("Cannot have an exclusion zone with a -ve duration");
        }
    }

    overlap_with(other: Exclusion) {
        return this.includes_date(other.start_date) ||
            this.includes_date(other.end_date) ||
            other.includes_date(this.start_date) ||
            other.includes_date(this.end_date);
    }

    includes_date(date: Date) {
        return this.start_date <= date && date < this.end_date;
    }

    get duration_in_days(): number {
        return daysBetween(this.start_date, this.end_date);
    }

    valueOf() {
        if (this.duration_in_days > 1) {
            return `${this.start_date.toDateString()} => ${this.end_date.toDateString()}`;
        }
        return `${this.start_date.toDateString()}`;
    }
}

class ScheduleEntry {
    person?: Person;
}

/*
 A line in the schedule, for a given date.
 People are in various roles on a date.
 */
class ScheduleAtDate {
    date: Date;
    people_score: Map<Person, ScheduleScore>;

    constructor(date: Date) {
        this.date = date;
        this.people_score = new Map<Person, ScheduleScore>();
    }

    get date_key(): string {
        return dayAndHourForDate(this.date);
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

    score_for(p: Person): ScheduleScore {
        return this.people_score.get(p);
    }

    add_person(person: Person, role: Role) {
        if (!this.people_score.get(person)) {
            this.people_score.set(person, new ScheduleScore(role));
        } else {
            let score = this.people_score.get(person);
            score.add_role(role);
        }
    }

    people_in_role(role: Role): Array<Person> {
        // Return all people that have some score that records this role
        return this.people.filter(p => {
            let score = this.people_score.get(p);
            return score.has_role(role);
        });
    }

    number_of_people_in_role(role: Role): number {
        return this.people_in_role(role).length;
    }

    roles_of_person(person: Person): Array<Role> {
        let persons_score = this.people_score.get(person);
        if (!persons_score) {
            return [];
        }
        return persons_score.roles;
    }

    valueOf() {
        let names_with_tasks = this.people_sorted_by_role_priority.map(p => {
            return p.name + "=" + this.people_score.get(p);
        });
        return this.date.toDateString() + " - " + _.join(names_with_tasks, ',');
    }

    set_decisions(person: Person, role: Role, decisions: Array<string>) {
        if (!this.people_score.has(person)) {
            throw Error("Cant set facts, no person");
        }
        let person_score = this.people_score.get(person);
        person_score.decisions = decisions;
    }

    includes_person(person: Person) {
        return this.people_score.has(person);
    }

    move_person(owner: Person, to_date: ScheduleAtDate, reason: string = null) {
        // Find the roles this person was doing
        let roles = this.roles_of_person(owner);
        if (roles.length) {
            let score = this.people_score.get(owner);
            if (score) {
                this.people_score.delete(owner);
                roles.forEach(r => {
                    to_date.add_person(owner, r);
                });
                let new_score = to_date.score_for(owner);
                new_score.decisions = new_score.decisions.concat(score.decisions);
                if (reason) {
                    new_score.decisions.push(reason)
                }
            }
        }
    }

    can_place_person_in_role(person: Person, role: Role) {
        return this.number_of_people_in_role(role) < role.maximum_count;
    }
}


export {
    Exclusion,
    ScheduleInput,
    ScheduleScore,
    ScheduleAtDate,
    daysBetween,
    ObjectValidation
}