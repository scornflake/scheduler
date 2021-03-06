import {ScheduleAtDate} from "../shared";
import {Person} from "../people";
import * as _ from 'lodash';
import {csd, dayAndHourForDate} from "../common/date-utils";
import {AccumulatedFacts} from "./accumulated-facts";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Assignment} from "../assignment";
import {Plan} from "../plan";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Role} from "../role";
import {action, computed, observable} from "mobx-angular";
import {ObjectWithUUID} from "../base-types";
import {LogLevel} from "ionic-logging-service";

class ScheduleWithRules {
    @observable plan: Plan;
    @observable facts: AccumulatedFacts;
    free_text: {};
    id: string = ObjectWithUUID.guid();

    private previous_scheduler: ScheduleWithRules;

    static loggerName = "scheduler";

    constructor(plan: Plan, previous: ScheduleWithRules = null) {
        if (!plan) {
            throw new Error(`no plan given to the SchedulerWithRules`);
        }
        this.plan = plan;
        this.plan.validate();
        this.free_text = {};
        if (previous) {
            this.warmupUsing(previous);
        }

        this.clear_working_state();
    }

    @computed get dates(): Array<ScheduleAtDate> {
        return this.facts.schedule_dates;
    }

    scheduleForDate(date: Date): ScheduleAtDate {
        return this.facts.get_schedule_for_date(date);
    }

    @computed get assignments(): Array<Assignment> {
        return this.plan.assignments;
    }

    createSchedule() {
        if (!this.plan) {
            throw new Error("No service defined, cannot create the schedule");
        }
        let schedule_duration = this.plan.schedule_duration_in_days;
        LoggingWrapper.info(ScheduleWithRules.loggerName, "Working from " + this.plan.start_date + " to: " + this.plan.end_date);
        LoggingWrapper.debug(ScheduleWithRules.loggerName, "Schedule is " + schedule_duration + " days long");

        let role_groups = this.plan.roles_in_layout_order_grouped;
        let role_names = role_groups.map(roleGroup => SWBSafeJSON.stringify(roleGroup.roles.map(r => r.name)));
        LoggingWrapper.debug(ScheduleWithRules.loggerName, "Roles (in order of importance): " + SWBSafeJSON.stringify(role_names));

        this.facts.begin();

        role_groups.forEach(rg => this.process_role_group(rg.roles));

        this.process_secondary_actions();
    }

    process_role_group(role_group: Array<Role>) {
        this.facts.begin_new_role_group(role_group);

        let current_date = this.plan.start_date;
        LoggingWrapper.debug(ScheduleWithRules.loggerName, "\r\nNext group: " + SWBSafeJSON.stringify(role_group.map(r => r.name)));

        // Iterate through all dates
        let iterations = 0;

        while (current_date.valueOf() <= this.plan.end_date.valueOf()) {
            let oldLogLevel: number = -1;
            let dateAtHour = dayAndHourForDate(current_date);
            let debugDate = csd(2018, 7, 29);
            let isCertainDay = dateAtHour == dayAndHourForDate(debugDate);
            // let isCertainRole = role_group.find(r => r.name == "Sound");
            if (isCertainDay) {
                oldLogLevel = LoggingWrapper.setLogLevel(ScheduleWithRules.loggerName, LogLevel.DEBUG, `Debugging ${debugDate}`);
            }

            LoggingWrapper.debug(ScheduleWithRules.loggerName, `Next date: ${current_date}`);

            for (let role of role_group) {
                this.facts.begin_new_role(current_date);
                // Put everyone who wants to be doing something specifically on a certain date in place first
                this.process_role(current_date, role, role_group);
            }

            // Move to the next date
            current_date = this.choose_next_schedule_date(current_date);

            LoggingWrapper.setLogLevel(ScheduleWithRules.loggerName, oldLogLevel, `Finish debug of ${debugDate}`);

            // This is taking 10,000 reasons too far!
            iterations++;
            if (iterations > 10000) {
                LoggingWrapper.error(ScheduleWithRules.loggerName, "Max iterations - bug!?");
                break
            }

        }
    }

    layout_specific_roles(current_date: Date, role: Role): Array<Assignment> {
        // Check if anyone has specifics for this date
        let placements = new Array<Assignment>();
        this.assignments.forEach(assignment => {
            // Find out if they want to do something specifically on this day
            let specificRolesForDate = assignment.specific_roles_for_date(current_date);
            if (specificRolesForDate) {
                let applicable_roles = specificRolesForDate.filter(r => r.uuid == role.uuid);
                if (applicable_roles) {
                    applicable_roles.forEach(role => {
                        this.facts.place_person_in_role(assignment, role, current_date, true, true, "because they want to be on specifically");
                        placements.push(assignment);
                    });
                }
            }
        });
        return placements;
    }

    is_role_filled_for_date(role: Role, date: Date) {
        if (!this.facts) {
            return false;
        }
        let specific_day = this.facts.get_schedule_for_date(date);
        let peopleInRole = specific_day.people_in_role(role);
        return peopleInRole.length >= role.maximum_wanted;
    }

    process_role(current_date: Date, role: Role, role_group: Array<Role>) {
        if (!this.facts) {
            throw new Error("No facts defined. Cannot process role");
        }
        let specific_day = this.facts.get_schedule_for_date(current_date);
        LoggingWrapper.debug(ScheduleWithRules.loggerName, `Processing role ${role}`);

        // If already at max for this role, ignore it.
        if (this.is_role_filled_for_date(role, current_date)) {
            LoggingWrapper.debug(ScheduleWithRules.loggerName, `Not processing ${role.name}, already have ${role.maximum_wanted} assigned`);
            return;
        }

        // For this date, try to layout all people
        let assignments_for_this_role = this.plan.assignments_with_role(role);

        // Setup our available people (which at the beginning, is 'everyone')
        if (assignments_for_this_role.length == 0) {
            LoggingWrapper.debug(ScheduleWithRules.loggerName, `Laying out role: ${role.name} ... skipping (no one to do it)`);
            return;
        }

        let iteration_max = assignments_for_this_role.length;
        let person_placed_into_role = null;

        this.facts.add_decision("Role: " + role.name, false);
        let specifically_placed_people = this.layout_specific_roles(current_date, role);

        while (iteration_max > 0 && specific_day.number_of_people_in_role(role) < role.maximum_wanted) {
            iteration_max--;

            let next_suitable_assignment = this.facts.get_next_suitable_assignment_for(role);
            if (next_suitable_assignment == null) {
                this.facts.add_decision("No people available for role " + role.name);
                break;
            }

            let canThisPersonDoRole = !_.includes(specific_day.people_in_role(role), next_suitable_assignment.person);
            this.facts.add_decision(`Can ${next_suitable_assignment.name} do role ${role.name}? ${canThisPersonDoRole ? 'Yes' : 'No'}`);
            if (!canThisPersonDoRole) {
                let message = "Skipping " + next_suitable_assignment.name + ", they are already on it";
                // TODO: Fix? this is a hack to make sure we don't infinite loop. If we get here, looping would bring us right back unless we change engine state
                this.facts.use_this_person_in_role(next_suitable_assignment, role);
                this.facts.add_decision(message);
                continue;
            }

            let get_next_suitable_role = this.facts.get_next_suitable_role_for_assignment(next_suitable_assignment);
            let next_wanted_role_for_assignment = get_next_suitable_role.role;

            // Only let this happen if the role is within the current group being processed
            // TODO: This could be optional (might not want role_groups being mutually exclusive like this)
            if (_.includes(role_group, next_wanted_role_for_assignment) && !this.is_role_filled_for_date(next_wanted_role_for_assignment, current_date)) {
                if (next_wanted_role_for_assignment.uuid != role.uuid) {
                    let other_decision = "Swapping " + next_suitable_assignment.name + " into " + next_wanted_role_for_assignment + " instead of " + role + " due to a role weighting";

                    this.facts.add_decision(get_next_suitable_role.reason);
                    if (this.facts.place_person_in_role(next_suitable_assignment, next_wanted_role_for_assignment, current_date, true, true, other_decision)) {
                        // now continue with the loop, because we still havn't found someone for the role we were originally looking for.
                        this.facts.set_decisions_for(next_suitable_assignment, next_wanted_role_for_assignment, current_date, false);
                        this.facts.add_decision("Check role " + role + " again because of weighted placement");
                        continue;
                    }
                }
            }

            // OK. So. Turns out the role is the same.
            // Place the person, and we're done filling this role.
            let did_place = this.facts.place_person_in_role(next_suitable_assignment, role, current_date, true, true, `Place ${next_suitable_assignment.person} into ${role.name} because ${get_next_suitable_role.reason}`);
            if (did_place) {
                person_placed_into_role = next_suitable_assignment;
            }

            let numberOfPeopleInRole = specific_day.number_of_people_in_role(role);
            if (numberOfPeopleInRole >= role.maximum_wanted) {
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
        LoggingWrapper.debug(ScheduleWithRules.loggerName, `Moving from date ... : ${next_date}`);
        next_date.setDate(date.getDate() + this.plan.days_per_period);
        LoggingWrapper.debug(ScheduleWithRules.loggerName, `.... to date ... : ${next_date}`);
        return next_date;
    }

    @action
    private clear_working_state() {
        this.facts = new AccumulatedFacts(this.plan);
        if (this.previous_scheduler) {
            this.facts.copyUsageDataFrom(this.previous_scheduler.facts);
            LoggingWrapper.info(ScheduleWithRules.loggerName, "Taking usage data from previous schedule...");
        }
        this.prepare_rules_for_execution();
    }

    jsonResult() {
        // An array of dictionaries
        // Each dict is ordered keys, being in order of the role

        // These 'people' end up being our roles.
        // Thing is, we want to know ALL people, in order...
        // So I think - lets do this for ALL roles first
        let ordered_roles = this.plan.roles_in_layout_order;
        let dates = this.facts.schedule_dates;

        let rows = [];
        for (let schedule_for_day of dates) {
            // We create a dict, in order, for EVERY key of ordered_roles
            let rowDict = {};

            rowDict['date'] = schedule_for_day.date;
            rowDict['date_key'] = schedule_for_day.date_key;

            // Look at each known service_role. Fill in the people fulfilling that service_role
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

    jsonFields(): Array<{ name: string, priority: number }> {
        let ordered_roles = this.plan.roles_in_layout_order;
        let field_names = ordered_roles.map(r => {
            return {name: r.name, priority: r.layout_priority};
        });
        return [
            {name: "Date", priority: 100},
            ...field_names
        ]
    }

    reasons_for(person: Person, date: Date): Array<string> {
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

    warmupUsing(previous_schedule: ScheduleWithRules) {
        this.previous_scheduler = previous_schedule;
        LoggingWrapper.info(ScheduleWithRules.loggerName, "Warming up using a previous schedule...");
    }

    private prepare_rules_for_execution() {
        this.plan.assignments.forEach(assignment => {
            assignment.conditional_rules.forEach(a => a.prepare_for_execution());
            assignment.secondary_actions.forEach(a => a.prepare_for_execution());
        });
    }

    @action
    private process_secondary_actions() {
        // Check everyone that has secondary actions
        this.plan.assignments.forEach(assignment => {
            let secondary_actions = assignment.secondary_actions;
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