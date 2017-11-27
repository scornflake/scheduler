import {ScheduleAtDate, ScheduleInput} from "../common";
import {Role} from "../../state/roles";
import {Rules} from "./rules";

class ScheduleWithRules {
    dates: Map<string, ScheduleAtDate>;
    pick_rules: Map<Role, Rules>;
    params: ScheduleInput;

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

        let roles_groups = this.params.roles.roles_in_layout_order_grouped;
        let role_names = roles_groups.map(g => JSON.stringify(g.map(r => r.name)));
        console.log("Roles (in order of importance): " + JSON.stringify(role_names));

        let iterations = 0;
        for (let role_group of roles_groups) {
            let current_date = this.params.start_date;
            console.log("\r\nNext group: " + JSON.stringify(role_group.map(r => r.name)));

            // Iterate through all dates
            while (current_date.valueOf() < this.params.end_date.valueOf()) {
                console.log("Next date: " + current_date);

                // For this date, try to layout all people
                for (let role of role_group) {
                    let people_for_this_role = this.params.people.people_with_role(role);

                    // Setup our available people (which at the beginning, is 'everyone')
                    if (people_for_this_role.length == 0) {
                        // console.log("Laying out role: " + role.name + " ... skipping (no one to do it)");
                        continue;
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
        next_date.setDate(date.getDate() + this.params.days_per_period);
        // console.log(".... to date ... : " + next_date);
        return next_date;
    }

    private clear_working_state() {
        this.dates = new Map<string, ScheduleAtDate>();
    }

    private create_pick_rules() {
        // A person could have specific rules, like 'I want to be doing role X on date Y'
        // A person might have specific role weighting, like "80% bass, 20% keys".
        // A person might be unavailable on a given day

        // Pick rules are for picking PEOPLE for a role.
        // Each role ends up having a set of rules for it... based on peoples preferences

        this.pick_rules = new Map<Role, Rules>();

        for(let person of this.params.people.people) {

        }
    }
}

export {
    ScheduleWithRules
}