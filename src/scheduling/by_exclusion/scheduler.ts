import {Person, Unavailablity} from "../../state/people";
import {Role} from "../../state/roles";
import includes from 'lodash/includes';
import {Exclusion, ScheduleAtDate, ScheduleInput} from "../common";

export class ScheduleByExclusion {
    role_index: Map<Role, number>;
    dates: Map<string, ScheduleAtDate>;
    exclusion_zones: Map<Person, Array<Exclusion>>;

    private params: ScheduleInput;

    constructor(params: ScheduleInput) {
        this.params = params;
        this.params.validate();
        this.clear_working_state();
    }

    private clear_working_state() {
        this.role_index = new Map<Role, number>();
        this.dates = new Map<string, ScheduleAtDate>();
        this.exclusion_zones = new Map<Person, Array<Exclusion>>();
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
        return this.params.schedule_duration_in_days;
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
        this.clear_working_state();
        console.log("Working from " + this.params.start_date + " to: " + this.params.end_date);
        let schedule_duration = this.schedule_duration_in_days;
        console.log("Schedule is " + schedule_duration + " days long");

        let iterations = 0;

        // Work through all roles first, by date.
        let roles_store = this.params.roles;
        let people_store = this.params.people;
        let roles_groups = roles_store.roles_in_layout_order_grouped;
        let role_names = roles_groups.map(g => JSON.stringify(g.map(r => r.name)));
        console.log("Roles (in order of importance): " + JSON.stringify(role_names));

        for (let role_group of roles_groups) {
            let current_date = this.params.start_date;
            console.log("");
            console.log("Next group: " + JSON.stringify(role_group.map(r => r.name)));

            // Iterate through all dates
            while (current_date.valueOf() < this.params.end_date.valueOf()) {
                console.log("Next date: " + current_date);

                // For this date, try to layout all people
                for (let role of role_group) {
                    let people_for_this_role = people_store.people_with_role(role);

                    // Setup our available people (which at the beginning, is 'everyone')
                    if (people_for_this_role.length == 0) {
                        // console.log("Laying out role: " + role.name + " ... skipping (no one to do it)");
                        continue;
                    }
                    console.log("Considering: " + JSON.stringify(people_for_this_role.map(p => {
                        return p.name;
                    })) + " for role " + role.name + " on " + current_date.toDateString());

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

                        // If already in this role, skip
                        let specific_day = this.get_schedule_for_date(current_date);
                        if (includes(specific_day.people_in_role(role), person)) {
                            console.log("Skipping " + person.name + ", they are already on it");
                            continue;
                        }

                        let [has_exclusion, reason] = this.has_exclusion_for(current_date, person, role);
                        if (has_exclusion) {
                            console.log(person.name + " cant do it, they have an exclusion: " + reason);
                            continue;
                        }

                        // ok. We can put someone in this slot then.
                        if (!specific_day) {
                            throw Error("What? Unable to get a schedule for " + current_date);
                        }
                        specific_day.add_person(person, role);
                        this.record_exclusions(current_date, person, role);

                        // record that we used this index
                        this.role_index.set(role, actulal_index + 1);

                        // OK. Have we reached the max?
                        let peopleInRole = specific_day.people_in_role(role);
                        if (peopleInRole.length >= role.maximum_count) {
                            // Done. We can move on.
                            break;
                        }
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
                return [true, "overlap with existing " + JSON.stringify(exclusion)];
            }
        }
        return [false, "clear!"];
    }

    private record_exclusions(date: Date, person: Person, primary_role: Role) {
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            exclusions_for_person = [];
        }

        // make the exclusion
        let availability = person.prefs.availability;
        let end_date = availability.get_end_date_from(date);

        for (let role of person.role_include_dependents_of(primary_role)) {
            let exclusion = new Exclusion(date, end_date, role);
            exclusions_for_person.push(exclusion);
            console.log("Recorded exclusion for " + person.name + " from " + date + " for " + exclusion.duration_in_days + " days");
            this.exclusion_zones.set(person, exclusions_for_person);
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
                // if (peopleInRole.length > 0) {
                //     let names = peopleInRole.map(r => r.name);
                //     rowDict[role.name] = names.join(",");
                // } else {
                //     if (!minimized) {
                //         rowDict[role.name] = "";
                //     }
                // }
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

