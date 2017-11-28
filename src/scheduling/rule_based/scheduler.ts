import {Exclusion, ScheduleAtDate, ScheduleInput} from "../common";
import {Role} from "../../state/roles";
import {Rules, RuleState} from "./rules";
import {Person, Unavailablity} from "../../state/people";
import * as _ from 'lodash';

class ScheduleWithRules {
    dates: Map<string, ScheduleAtDate>;
    pick_rules: Map<Role, Rules>;
    params: ScheduleInput;
    facts: RuleState;
    exclusion_zones: Map<Person, Array<Exclusion>>;

    constructor(input: ScheduleInput) {
        this.params = input;
        this.params.validate();
    }

    create_schedule() {
        this.clear_working_state();
        this.create_pick_rules();

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
        let role_store = this.params.roles;
        let people_store = this.params.people;

        let current_date = this.params.start_date;
        console.log("\r\nNext group: " + JSON.stringify(role_group.map(r => r.name)));

        // Iterate through all dates
        let iterations = 0;

        // This is all PickRules, for all roles
        let all_pick_rules = role_store.pick_rules(people_store);

        while (current_date.valueOf() < this.params.end_date.valueOf()) {
            console.log("Next date: " + current_date);
            this.facts.date = current_date;

            for (let role of role_group) {
                this.process_role(current_date, role, all_pick_rules);
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

    process_role(current_date: Date, role: Role, all_pick_rules: Map<Role, Rules>) {
        let specific_day = this.get_schedule_for_date(current_date);
        let peopleInRole = specific_day.people_in_role(role);
        if (peopleInRole.length >= role.maximum_count) {
            console.log("Not processing " + role.name + ", already have " + role.maximum_count + " slotted in");
            return;
        }

        // If already at max for this role, ignore it.

        // For this date, try to layout all people
        let people_for_this_role = this.params.people.people_with_role(role);

        // Setup our available people (which at the beginning, is 'everyone')
        if (people_for_this_role.length == 0) {
            // console.log("Laying out role: " + role.name + " ... skipping (no one to do it)");
            return;
        }

        for (let person of people_for_this_role) {
            this.facts.person = person;
            console.log("Can " + person.name + " do role " + role.name + "?");
            let pick_rules_for_role = all_pick_rules.get(role);
            if (pick_rules_for_role == null) {
                throw Error("No pick rules setup for role: " + role.name)
            }

            let next_suitable_person_iterator = pick_rules_for_role.execute(this.facts);
            let next_suitable_person = next_suitable_person_iterator.next().value;
            if (next_suitable_person == null) {
                console.log("No people suitable for role " + role.name);
                continue;
            }

            console.log("Next suitable is " + next_suitable_person.name);
            if (_.includes(specific_day.people_in_role(role), person) ||
                _.includes(specific_day.people_in_role(role), next_suitable_person)) {
                console.log("Skipping " + person.name + ", they are already on it");
                continue;
            }

            // Is the person available according to their availability preference?
            let [has_exclusion, reason] = this.has_exclusion_for(current_date, person, role);
            if (has_exclusion) {
                console.log(person.name + " cant do it, they have an exclusion: " + reason);
                continue;
            }

            let persons_role_rules = next_suitable_person.role_rules();
            let next_wanted_role = persons_role_rules.execute(this.facts).next().value;
            if (next_wanted_role.uuid != role.uuid) {
                console.log("Putting " + next_suitable_person.name + " into " + next_wanted_role + " instead of " + role + " due to a role weighting");
                this.place_person_in_role(next_suitable_person, next_wanted_role, current_date);
                // now continue with the loop, because we still havn't found someone for the role we were originally looking for.
                let pick_rule = all_pick_rules.get(next_wanted_role);
                pick_rule.use_this_person(next_suitable_person);
                persons_role_rules.use_this_role(next_wanted_role);
                continue;
            }

            // OK. So. Turns out the role is the same.
            // Place the person, and we're done filling this role.
            this.place_person_in_role(next_suitable_person, role, current_date);
            pick_rules_for_role.use_this_person(next_suitable_person);
            persons_role_rules.use_this_role(next_wanted_role);

            let peopleInRole = specific_day.people_in_role(role);
            if (peopleInRole.length >= role.maximum_count) {
                console.log("Done with " + role.name + ", have " + role.maximum_count + " slotted in");
                return;
            }
        }
    }

    has_exclusion_for(date: Date, person: Person, role: Role): any[] {
        // Is this person unavailable on this date?
        if (person.is_unavailable_on(date)) {
            return [true, "unavailable"];
        }

        // Is this person excluded for this date?
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            return [false, "no exclusions for " + person.name];
        }

        // Does the exclusion zone for this person overlap with any existing?
        let availability = person.prefs.availability;
        let end_date = availability.get_end_date_from(date);
        let new_exclusion = new Exclusion(date, end_date, role);

        for (let exclusion of exclusions_for_person) {
            if (exclusion.overlap_with(new_exclusion)) {
                return [true, "overlap with existing " + exclusion];
            }
        }
        return [false, "clear!"];
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
        let specific_day = this.get_schedule_for_date(date);
        console.log("Putting " + person.name + " into " + role + " on " + date.toDateString());
        specific_day.add_person(person, role);

        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            exclusions_for_person = [];
        }

        // make the exclusion
        let availability = person.prefs.availability;
        let end_date = availability.get_end_date_from(date);

        for (let r of person.role_include_dependents_of(role)) {
            let exclusion = new Exclusion(date, end_date, r);
            exclusions_for_person.push(exclusion);
            console.log("Recorded exclusion for " + person.name + " from " + date + " for " + exclusion.duration_in_days + " days");
            this.exclusion_zones.set(person, exclusions_for_person);
        }
    }

    private choose_next_schedule_date(date: Date): Date {
        let next_date = new Date(date);
        // console.log("Moving from date ... : " + next_date);
        next_date.setDate(date.getDate() + this.params.days_per_period);
        // console.log(".... to date ... : " + next_date);
        return next_date;
    }

    private clear_working_state() {
        this.exclusion_zones = new Map<Person, Array<Exclusion>>();
        this.dates = new Map<string, ScheduleAtDate>();
        this.facts = new RuleState();
    }

    private create_pick_rules() {
        // A person could have specific rules, like 'I want to be doing role X on date Y'
        // A person might have specific role weighting, like "80% bass, 20% keys".
        // A person might be unavailable on a given day

        // Pick rules are for picking PEOPLE for a role.
        // Each role ends up having a set of rules for it... based on peoples preferences

        this.pick_rules = new Map<Role, Rules>();

        for (let person of this.params.people.people) {

        }
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
                let peopleInRole = schedule_for_day.people_in_role(role);
                rowDict[role.name] = peopleInRole;
                if (peopleInRole.length > 0) {
                    let names = peopleInRole.map(r => r.name);
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

export {
    ScheduleWithRules
}