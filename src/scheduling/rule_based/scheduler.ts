import {Exclusion, ScheduleAtDate, ScheduleInput} from "../common";
import {Role} from "../../state/roles";
import {RuleFacts} from "./rules";
import {Person, Unavailablity} from "../../state/people";
import * as _ from 'lodash';

class ScheduleWithRules {
    dates: Map<string, ScheduleAtDate>;
    params: ScheduleInput;
    facts: RuleFacts;

    constructor(input: ScheduleInput) {
        this.params = input;
        this.params.validate();
    }

    create_schedule() {
        this.clear_working_state();

        console.log("Working from " + this.params.start_date + " to: " + this.params.end_date);
        let schedule_duration = this.params.schedule_duration_in_days;
        console.log("Schedule is " + schedule_duration + " days long");

        let role_store = this.params.roles;
        let role_groups = role_store.roles_in_layout_order_grouped;
        let role_names = role_groups.map(g => JSON.stringify(g.map(r => r.name)));
        console.log("Roles (in order of importance): " + JSON.stringify(role_names));

        role_groups.forEach(rg => this.process_role_group(rg));
    }

    process_role_group(role_group: Array<Role>) {
        this.facts.begin_new_role_group(role_group);

        let current_date = this.params.start_date;
        console.log("\r\nNext group: " + JSON.stringify(role_group.map(r => r.name)));

        // Iterate through all dates
        let iterations = 0;

        while (current_date.valueOf() < this.params.end_date.valueOf()) {
            console.log("Next date: " + current_date);

            for (let role of role_group) {
                this.facts.begin_new_role(current_date);
                this.process_role(current_date, role, role_group);
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

    is_role_filled_for_date(role:Role, date:Date) {
        let specific_day = this.get_schedule_for_date(date);
        let peopleInRole = specific_day.people_in_role(role);
        return peopleInRole.length >= role.maximum_count;

    }

    process_role(current_date: Date, role: Role, role_group: Array<Role>) {
        let specific_day = this.get_schedule_for_date(current_date);
        // let all_pick_rules = this.facts.all_pick_rules;

        // If already at max for this role, ignore it.
        if(this.is_role_filled_for_date(role, current_date)) {
            console.log("Not processing " + role.name + ", already have " + role.maximum_count + " slotted in");
            return;
        }

        // For this date, try to layout all people
        let people_for_this_role = this.params.people.people_with_role(role);

        // Setup our available people (which at the beginning, is 'everyone')
        if (people_for_this_role.length == 0) {
            // console.log("Laying out role: " + role.name + " ... skipping (no one to do it)");
            return;
        }

        this.facts.add_decision("Role: " + role.name, false);

        let iteration_max = people_for_this_role.length;
        while(iteration_max > 0) {
            iteration_max--;

            let next_suitable_person = this.facts.get_next_suitable_person_for(role);
            if (next_suitable_person == null) {
                this.facts.add_decision("No people suitable for role " + role.name);
                break;
            }

            let message = "Can " + next_suitable_person.name + " do role " + role.name + "?";
            this.facts.add_decision(message);

            if (_.includes(specific_day.people_in_role(role), next_suitable_person)) {
                let message = "Skipping " + next_suitable_person.name + ", they are already on it";
                // TODO: Fix? this is a hack to make sure we don't infinite loop. If we get here, looping would bring us right back unless we change engine state
                this.facts.use_this_person_in_role(next_suitable_person, role);
                this.facts.add_decision(message);
                continue;
            }

            let next_wanted_role_for_person = this.facts.get_next_suitable_role_for_person(next_suitable_person);

            // Only let this happen if the role is withing the current group being processed
            // TODO: This could be optional (might not want role_groups being mutually exclusive like this)
            if(_.includes(role_group, next_wanted_role_for_person) && !this.is_role_filled_for_date(next_wanted_role_for_person, current_date)) {
                if (next_wanted_role_for_person.uuid != role.uuid) {
                    this.facts.add_decision("Putting " + next_suitable_person.name + " into " + next_wanted_role_for_person + " instead of " + role + " due to a role weighting");

                    this.place_person_in_role(next_suitable_person, next_wanted_role_for_person, current_date);
                    this.facts.use_this_person_in_role(next_suitable_person, next_wanted_role_for_person);

                    this.facts.add_decision("Check role " + role + " again because of weighted placement");

                    // now continue with the loop, because we still havn't found someone for the role we were originally looking for.
                    continue;
                }
            }

            // OK. So. Turns out the role is the same.
            // Place the person, and we're done filling this role.
            this.place_person_in_role(next_suitable_person, role, current_date);
            this.facts.use_this_person_in_role(next_suitable_person, next_wanted_role_for_person);

            let peopleInRole = specific_day.people_in_role(role);
            if (peopleInRole.length >= role.maximum_count) {
                this.facts.add_decision("Done with " + role.name + ", have " + role.maximum_count + " slotted in");
                return;
            }
        }
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
            // console.log("Reuse schedule for " + dateAtHour + " = " + date);
            return schedule;
        }
    }

    private place_person_in_role(person: Person, role: Role, date: Date) {
        this.facts.add_exclusion_for(person, role, date);

        let specific_day = this.get_schedule_for_date(date);
        this.facts.add_decision("Placing " + person.name + " into " + role);
        specific_day.add_person(person, role, this.facts);
    }

    private choose_next_schedule_date(date: Date): Date {
        let next_date = new Date(date);
        // console.log("Moving from date ... : " + next_date);
        next_date.setDate(date.getDate() + this.params.days_per_period);
        // console.log(".... to date ... : " + next_date);
        return next_date;
    }

    private clear_working_state() {
        this.dates = new Map<string, ScheduleAtDate>();
        this.facts = new RuleFacts(this.params.people, this.params.roles);
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

            rowDict['date'] = schedule_for_day.date;
            rowDict['date_key'] = dateString;

            // Look at each known role. Fill in the people fulfilling that role
            for (let role of ordered_roles) {
                // Do we have a value, for this?
                rowDict[role.name] = schedule_for_day.people_in_role(role);
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

    reasons_for(person: Person, date: Date, role: Role): Array<string> {
        let specific_day = this.get_schedule_for_date(date);
        let score = specific_day.score_for(person);
        if (score) {
            return score.decisions;
        }
        return [];
    }

    is_person_in_exclusion_zone(person: Person, role: Role, date_for_row: Date) {
        return this.facts.is_person_in_exclusion_zone(person, role, date_for_row);
    }
}

export {
    ScheduleWithRules
}