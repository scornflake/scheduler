import {ScheduleAtDate, ScheduleInput} from "../common";
import {Role} from "../../state/roles";
import {Person} from "../../state/people";
import * as _ from 'lodash';
import {Logger} from "ionic-logging-service";
import {dayAndHourForDate} from "../../common/date-utils";
import {RuleFacts} from "./rule-facts";
import {LoggingWrapper} from "../../common/logging-wrapper";

class ScheduleWithRules {
    params: ScheduleInput;
    facts: RuleFacts;
    free_text: {};

    private logger: Logger;
    private previous_scheduler: ScheduleWithRules;

    constructor(input: ScheduleInput, previous: ScheduleWithRules = null) {
        this.logger = LoggingWrapper.getLogger("scheduler");

        this.params = input;
        this.params.validate();
        this.free_text = {};
        if (previous) {
            this.warmup_using(previous);
        }
        this.clear_working_state();
    }

    get dates(): Array<ScheduleAtDate> {
        return this.facts.schedule_dates;
    }

    create_schedule() {
        let schedule_duration = this.params.schedule_duration_in_days;
        this.logger.info("Working from " + this.params.start_date + " to: " + this.params.end_date);
        this.logger.debug("Schedule is " + schedule_duration + " days long");

        let role_store = this.params.roles;
        let role_groups = role_store.roles_in_layout_order_grouped;
        let role_names = role_groups.map(g => JSON.stringify(g.map(r => r.name)));
        this.logger.debug("Roles (in order of importance): " + JSON.stringify(role_names));

        this.facts.begin();

        role_groups.forEach(rg => this.process_role_group(rg));

        this.process_secondary_actions();
    }

    process_role_group(role_group: Array<Role>) {
        this.facts.begin_new_role_group(role_group);

        let current_date = this.params.start_date;
        this.logger.debug("\r\nNext group: " + JSON.stringify(role_group.map(r => r.name)));

        // Iterate through all dates
        let iterations = 0;

        while (current_date.valueOf() <= this.params.end_date.valueOf()) {
            this.logger.debug("Next date: " + current_date);

            for (let role of role_group) {
                this.facts.begin_new_role(current_date);
                // Put everyone who wants to be doing something specifically on a certain date in place first
                this.process_role(current_date, role, role_group);
            }

            // Move to the next date
            current_date = this.choose_next_schedule_date(current_date);

            // This is taking 10,000 reasons too far!
            iterations++;
            if (iterations > 10000) {
                this.logger.error("Max iterations - bug!?");
                break
            }

        }
    }

    layout_specific_roles(current_date: Date, role: Role): Array<Person> {
        // Check if anyone has specifics for this date
        let placed_people = new Array<Person>();
        this.params.people.people.forEach(person => {
            // Find out if they want to do something specifically on this day
            let specificRolesForDate = person.specific_roles_for_date(current_date);
            if (specificRolesForDate) {
                let applicable_roles = specificRolesForDate.filter(r => r.uuid == role.uuid);
                if (applicable_roles) {
                    applicable_roles.forEach(role => {
                        this.facts.place_person_in_role(person, role, current_date, true, true, "because they want to be on specifically");
                        placed_people.push(person);
                    });
                }
            }
        });
        return placed_people;
    }

    is_role_filled_for_date(role: Role, date: Date) {
        if (!this.facts) {
            return false;
        }
        let specific_day = this.facts.get_schedule_for_date(date);
        let peopleInRole = specific_day.people_in_role(role);
        return peopleInRole.length >= role.maximum_count;
    }

    process_role(current_date: Date, role: Role, role_group: Array<Role>) {
        if (!this.facts) {
            throw new Error("No facts defined. Cannot process role");
        }
        let specific_day = this.facts.get_schedule_for_date(current_date);

        // If already at max for this role, ignore it.
        if (this.is_role_filled_for_date(role, current_date)) {
            this.logger.debug("Not processing " + role.name + ", already have " + role.maximum_count + " slotted in");
            return;
        }

        // For this date, try to layout all people
        let people_for_this_role = this.params.people.people_with_role(role);

        // Setup our available people (which at the beginning, is 'everyone')
        if (people_for_this_role.length == 0) {
            // this.logger.debug("Laying out role: " + role.name + " ... skipping (no one to do it)");
            return;
        }

        let iteration_max = people_for_this_role.length;
        let person_placed_into_role = null;

        this.facts.add_decision("Role: " + role.name, false);
        let specifically_placed_people = this.layout_specific_roles(current_date, role);

        while (iteration_max > 0 && specific_day.number_of_people_in_role(role) < role.maximum_count) {
            iteration_max--;

            let next_suitable_person = this.facts.get_next_suitable_person_for(role);
            if (next_suitable_person == null) {
                this.facts.add_decision("No people available for role " + role.name);
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

            // Only let this happen if the role is within the current group being processed
            // TODO: This could be optional (might not want role_groups being mutually exclusive like this)
            if (_.includes(role_group, next_wanted_role_for_person) && !this.is_role_filled_for_date(next_wanted_role_for_person, current_date)) {
                if (next_wanted_role_for_person.uuid != role.uuid) {

                    let other_decision = "Putting " + next_suitable_person.name + " into " + next_wanted_role_for_person + " instead of " + role + " due to a role weighting";

                    if (this.facts.place_person_in_role(next_suitable_person, next_wanted_role_for_person, current_date, true, true, other_decision)) {
                        // now continue with the loop, because we still havn't found someone for the role we were originally looking for.
                        this.facts.add_decision("Check role " + role + " again because of weighted placement");
                        continue;
                    }
                }
            }

            // OK. So. Turns out the role is the same.
            // Place the person, and we're done filling this role.
            let did_place = this.facts.place_person_in_role(next_suitable_person, role, current_date);
            if (did_place) {
                person_placed_into_role = next_suitable_person;
            }

            let numberOfPeopleInRole = specific_day.number_of_people_in_role(role);
            if (numberOfPeopleInRole >= role.maximum_count) {
                this.facts.add_decision("Done with role.");
            }

            if (person_placed_into_role) {
                this.facts.set_decisions_for(person_placed_into_role, role, current_date);
                person_placed_into_role = null;
            }
        }

        if (specifically_placed_people.length) {
            specifically_placed_people.forEach(p => {
                this.facts.set_decisions_for(p, role, current_date, false);
            });
            this.facts.clear_decisions();
        }
    }

    private choose_next_schedule_date(date: Date): Date {
        let next_date = new Date(date);
        // this.logger.debug("Moving from date ... : " + next_date);
        next_date.setDate(date.getDate() + this.params.days_per_period);
        // this.logger.debug(".... to date ... : " + next_date);
        return next_date;
    }

    private clear_working_state() {
        this.facts = new RuleFacts(this.params.people, this.params.roles);
        if (this.previous_scheduler) {
            this.facts.copyUsageDataFrom(this.previous_scheduler.facts);
            this.logger.info("Taking usage data from previous schedule...");
        }
    }

    jsonResult(minimized: boolean = false) {
        // An array of dictionaries
        // Each dict is ordered keys, being in order of the role

        // These 'people' end up being our roles.
        // Thing is, we want to know ALL people, in order...
        // So I think - lets do this for ALL roles first
        let ordered_roles = this.params.roles.roles_in_layout_order;
        let dates = this.facts.schedule_dates;

        let rows = [];
        for (let schedule_for_day of dates) {
            // We create a dict, in order, for EVERY key of ordered_roles
            let rowDict = {};

            rowDict['date'] = schedule_for_day.date;
            rowDict['date_key'] = schedule_for_day.date_key;

            // Look at each known role. Fill in the people fulfilling that role
            for (let role of ordered_roles) {
                // Do we have a value, for this?
                let free_text = this.notes_for_date(schedule_for_day.date, role);
                let value_for_cell = schedule_for_day.people_in_role(role);
                rowDict[role.name] = [...free_text, ...value_for_cell];
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
            "Date",
            ...field_names
        ]
    }

    reasons_for(person: Person, date: Date, role: Role): Array<string> {
        let specific_day = this.facts.get_schedule_for_date(date);
        let score = specific_day.score_for(person);
        if (score) {
            return score.decisions;
        }
        return [];
    }

    is_person_in_exclusion_zone(person: Person, role: Role, date_for_row: Date) {
        return this.facts.is_person_in_exclusion_zone(person, role, date_for_row);
    }

    add_note(date: Date, role: Role, note: string) {
        let role_map = this.get_role_map_for(date, role);
        role_map.push(note);
    }

    notes_for_date(date: Date, role: Role): string[] {
        return this.get_role_map_for(date, role);
    }

    private get_role_map_for(date: Date, role: Role): string[] {
        if (!this.free_text) {
            this.free_text = {};
        }

        let date_key = dayAndHourForDate(date);
        if (!this.free_text[date_key]) {
            this.free_text[date_key] = {};
        }

        let role_map = this.free_text[date_key];
        if (!role_map[role.uuid]) {
            role_map[role.uuid] = [];
        }
        return role_map[role.uuid];
    }

    warmup_using(previous_schedule: ScheduleWithRules) {
        this.previous_scheduler = previous_schedule;
        this.logger.info("Warming up using a previous schedule...");
    }

    private process_secondary_actions() {
        // Check everyone that has secondary actions
        this.params.people.people.forEach(person => {
            let secondary_actions = person.secondary_actions;
            secondary_actions.forEach(secondary_action => {
                /*
                Iterate all dates in the schedule. Does the action want to do anything?
                 */
                for (let schedule_on_date of this.dates) {
                    secondary_action.execute(schedule_on_date, this);
                }
            });
        });
    }

    closest_schedule_date(date: Date, distance_predicate: (sd) => number | boolean): ScheduleAtDate {
        let min_distance: number = 32767;
        let chosen_sd = null;
        this.dates.forEach(sd => {
            let this_distance = distance_predicate(sd);
            if (typeof this_distance === 'boolean') {
                if (!this_distance) {
                    return;
                }
            }
            if (typeof this_distance === 'number') {
                if (this_distance < min_distance) {
                    min_distance = this_distance;
                    chosen_sd = sd;
                }
            }
        });
        return chosen_sd;
    }
}

export {
    ScheduleWithRules
}