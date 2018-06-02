import {Person} from "./people";
import * as _ from 'lodash';
import {dayAndHourForDate} from "./common/date-utils";
import {Assignment} from "./assignment";
import {isUndefined} from "util";
import {delete_from_array} from "./common/base_model";
import {Role} from "./service";

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

    static simple(personIsRequired: string) {
        let validation = new ObjectValidation();
        validation.add_error(personIsRequired);
        return validation;
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

    remove_role(r: Role) {
        delete_from_array(this.roles, r);
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

/*
 A line in the schedule, for a given date.
 People are in various roles on a date.
 */
class ScheduleAtDate {
    date: Date;
    assignment_by_score: Map<Assignment, ScheduleScore>;

    constructor(date: Date) {
        this.date = date;
        this.assignment_by_score = new Map<Assignment, ScheduleScore>();
    }

    get date_key(): string {
        return dayAndHourForDate(this.date);
    }

    get people(): Array<Person> {
        return Array.from(this.assignment_by_score.keys()).map(a => a.person);
    }

    get assignments(): Array<Assignment> {
        return Array.from<Assignment>(this.assignment_by_score.keys());
    }

    get people_sorted_by_role_priority(): Array<Person> {
        return this.assignments.sort((a: Assignment, b: Assignment) => {
            if (a.highest_role_layout_priority > b.highest_role_layout_priority) {
                return 1;
            } else if (a.highest_role_layout_priority < b.highest_role_layout_priority) {
                return -1;
            }
            return 0;
        }).map(a => a.person);
    }

    score_for(p: Person): ScheduleScore {
        let assign = this.assignment_for_person(p);
        if (assign) {
            return this.assignment_by_score.get(assign);
        }
        return null;
    }

    add_person(assignment: Assignment, role: Role) {
        if (assignment == null) {
            throw new Error("Cannot add a 'null' assignment");
        }
        if (!this.assignment_by_score.get(assignment)) {
            this.assignment_by_score.set(assignment, new ScheduleScore(role));
        } else {
            let score = this.assignment_by_score.get(assignment);
            score.add_role(role);
        }
    }

    people_in_role(role: Role): Array<Person> {
        // Return all people that have some score that records this role
        let assigns = this.assignments;
        let filterer = assigns.filter(a => {
            // let datekey = dayAndHourForDate(this.date);
            let score = this.assignment_by_score.get(a);
            if (score) {
                return score.has_role(role);
            }
            return false;
        });
        return filterer.map((a) => {
            if (isUndefined(a)) {
                console.log("panic");
            }
            return a.person;
        });
    }

    number_of_people_in_role(role: Role): number {
        return this.people_in_role(role).length;
    }

    roles_of_person(person: Person): Array<Role> {
        let assignment = this.assignment_for_person(person);
        if (assignment) {
            return assignment.roles;
        }
        return [];
    }

    assignment_for_person(person: Person): Assignment {
        return this.assignments.find(a => a.person.uuid == person.uuid);
    }

    score_for_person(person: Person): ScheduleScore {
        let assignment = this.assignment_for_person(person);
        if (assignment) {
            return this.assignment_by_score.get(assignment);
        }
        return null;
    }

    valueOf() {
        let names_with_tasks = this.people_sorted_by_role_priority.map(p => {
            return `${p.name} = ${this.score_for(p)}`;
        });
        return this.date.toDateString() + " - " + _.join(names_with_tasks, ',');
    }

    set_decisions(assignment: Assignment, role: Role, decisions: Array<string>) {
        let score = this.assignment_by_score.get(assignment);
        if (!score) {
            throw Error("Cant set facts, no person/assignment in this date");
        }
        score.decisions = decisions;
    }

    includes_person(person: Person): boolean {
        let assigment = this.assignment_for_person(person);
        return assigment != null;
    }

    move_person(owner: Person, to_date: ScheduleAtDate, reason: string = null) {
        // Find the roles this person was doing
        let assignment_for_owner = this.assignment_for_person(owner);
        let score_for_owner = this.score_for_person(owner);
        if (!score_for_owner) {
            throw Error(`Cant move ${owner}, they are not assigned to this date`);
        }
        let roles = score_for_owner.roles;
        if (roles.length) {
            // Delete the entire score for this date, since this person won't be on ANY of their roles for this date
            this.assignment_by_score.delete(assignment_for_owner);

            // Add the roles this person WAS doing on this date, to the new date.
            roles.forEach(r => {
                to_date.add_person(assignment_for_owner, r);
            });

            // Migrate their decisions over as well
            let new_score = to_date.score_for(owner);
            new_score.decisions = new_score.decisions.concat(score_for_owner.decisions);
            if (reason) {
                new_score.decisions.push(reason)
            }
        }
    }

    can_place_person_in_role(person: Person, role: Role) {
        return this.number_of_people_in_role(role) < role.maximum_wanted;
    }
}


export {
    Exclusion,
    ScheduleScore,
    ScheduleAtDate,
    daysBetween,
    ObjectValidation
}