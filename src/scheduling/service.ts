import {BaseStore, delete_from_array, ObjectWithUUID} from "./common/base_model";
import {observable} from "mobx";
import {Logger} from "ionic-logging-service";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Assignment} from "./assignment";
import {Role} from "./role";
import * as _ from "lodash";
import {Person} from "./people";
import {OnThisDate, Rule, UsageWeightedSequential} from "./rule_based/rules";
import {isUndefined} from "ionic-angular/util/util";
import {daysBetween} from "./shared";

class Service extends ObjectWithUUID {
    @observable name: string;

    // These are the rules applied to the people doing this service/event
    @observable rules: Array<Rule>;

    start_date: Date;
    end_date: Date;
    days_per_period: number;

    manual_layouts: Map<Date, Role>;

    // This is the people available for this service/event
    assignments: Array<Assignment>;

    private logger: Logger;

    constructor(name: string) {
        super();
        this.name = name;
        this.assignments = new Array<Assignment>();
        this.logger = LoggingWrapper.getLogger("model.event");
        this.rules = new Array<Rule>();

        this.manual_layouts = new Map<Date, Role>();
        this.days_per_period = 7;
    }

    validate() {
        if (this.roles_in_layout_order.length == 0) {
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

    get_assignment_for(person: Person) {
        return this.assignments.find(a => a.person.uuid == person.uuid);
    }

    get_or_create_assignment_for(person: Person): Assignment {
        let found = this.get_assignment_for(person);
        if (found == null) {
            let assignment = new Assignment(person);
            this.assignments.push(assignment);
            return assignment;
        }
        return found;
    }

    assignments_with_role(role: Role): Array<Assignment> {
        return this.assignments.filter(assignment => {
            for (let person_role of assignment.roles) {
                if (role.uuid == person_role.uuid) {
                    return true;
                }
            }
            return false;
        });
    }

    order_people_by_role_layout_priority() {
        return this.assignments.sort((a1, a2) => {
            let maxlp1 = a1.max_role_layout_priority;
            let maxlp2 = a2.max_role_layout_priority;
            return maxlp1 < maxlp2 ? 1 : maxlp1 > maxlp2 ? -1 : 0;
        }).map(a => a.person);
    }

    get people(): Array<Person> {
        return this.assignments.map(a => a.person);
    }

    get roles(): Array<Role> {
        let all_roles = _.flatMap(this.assignments, (a: Assignment) => a.roles);
        return _.uniqBy(all_roles, r => r.uuid);
    }

    find_role(role_name: string) {
        if (isUndefined(role_name)) {
            return null;
        }
        return this.roles.find(r => r.name.toLowerCase() == role_name.toLowerCase());
    }

    add_person(person: Person): Assignment {
        return this.get_or_create_assignment_for(person)
    }

    remove_person(person: Person) {
        let assign = this.get_assignment_for(person);
        if (assign) {
            delete_from_array(this.assignments, assign);
        }
    }

    get roles_in_layout_order(): Array<Role> {
        return this.roles.sort((a: Role, b: Role) => {
            if (a.layout_priority < b.layout_priority) {
                return 1;
            } else if (a.layout_priority > b.layout_priority) {
                return -1;
            }
            return 0;
        });
    }

    pick_rules(): Map<Role, Array<Rule>> {
        let rule_map = new Map<Role, Array<Rule>>();
        for (let role of this.roles_in_layout_order) {
            let rules = [];

            // Find any specific rules for this date.
            rules = rules.concat(this.rules_for_role(role));

            // Ordering people sequentially
            let uws = new UsageWeightedSequential(this.assignments_with_role(role));
            rules.push(uws);

            rule_map.set(role, rules);
        }
        return rule_map;
    }

    private rules_for_role(role: Role) {
        return this.rules.filter(r => {
            if (r instanceof OnThisDate) {
                return r.role.uuid == role.uuid;
            }
            return false;
        });
    }

    addPickRule(rule: Rule) {
        /*
        When putting rules together, user specified pick rules must come before the
        UWS rules when executing. So we make sure they have a higher priority.
        */
        rule.priority = 10;
        this.rules.push(rule);
        // console.log("Rules now " + SafeJSON.stringify(this.rules));
    }

    get roles_in_layout_order_grouped(): Array<Array<Role>> {
        // Add all roles into a map
        let roles_in_order = this.roles_in_layout_order;
        let intermediate = new Map<number, Array<Role>>();
        for (let role of roles_in_order) {
            if (!intermediate.has(role.layout_priority)) {
                intermediate.set(role.layout_priority, []);
            }
            intermediate.set(role.layout_priority, [...intermediate.get(role.layout_priority), role]);
        }

        // Turn into an array
        let result = [];
        intermediate.forEach((list, key: number) => {
            result.push(list);
        });
        return result;
    }

    role_rules(): Map<Assignment, Array<Rule>> {
        let assignment_rule_map = new Map<Assignment, Array<Rule>>();
        for (let assignment of this.assignments) {
            assignment_rule_map.set(assignment, assignment.role_rules());
        }
        return assignment_rule_map;
    }
}

class EventStore extends BaseStore<Service> {
    private logger: Logger;
    events: Array<Service>;

    constructor() {
        super();
        this.logger = LoggingWrapper.getLogger("store.event");
        this.events = new Array<Service>();
    }

    add_event_named(event_name: string): Service {
        let service = new Service(event_name);
        this.events.push(service);
        return service;
    }
}

export {
    Service,
    EventStore
}