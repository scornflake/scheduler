import {BaseStore, delete_from_array, ObjectWithUUID} from "./common/base_model";
import {observable} from "mobx";
import {Assignment} from "./assignment";
import {Role} from "./role";
import * as _ from "lodash";
import {Person} from "./people";
import {OnThisDate, Rule, UsageWeightedSequential} from "./rule_based/rules";
import {isUndefined} from "ionic-angular/util/util";
import {daysBetween} from "./shared";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Team} from "./teams";

class ServiceRole {
    role: Role;
    required: boolean;

    maximum_count: number;
    layout_priority: number;

    constructor(role: Role, required: boolean = false, maximum = 1, layout_priority = 1) {
        this.role = role;
        this.required = required;
        this.maximum_count = maximum;
        this.layout_priority = layout_priority;
    }

    get name() {
        return this.role.name;
    }
}

class Service extends ObjectWithUUID {
    @observable name: string;

    start_date: Date;
    end_date: Date;
    days_per_period: number;

    manual_layouts: Map<Date, Role>;

    // This is the people available for this service/event
    private _assignments: Array<Assignment>;

    // These are the rules applied to the people doing this service/event
    private specific_role_rules: Array<Rule>;

    private logger: Logger;
    private team: Team;
    private roles: Array<ServiceRole>;

    constructor(name: string, team: Team) {
        super();

        this.team = team;
        this.name = name;
        this.roles = new Array<ServiceRole>();

        this._assignments = new Array<Assignment>();
        this.specific_role_rules = new Array<Rule>();

        this.manual_layouts = new Map<Date, Role>();
        this.days_per_period = 7;

        this.logger = LoggingWrapper.getLogger("model.service");
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

    get assignments(): Array<Assignment> {
        return this._assignments;
    }

    get_assignment_for(person: Person) {
        return this._assignments.find(a => a.person.uuid == person.uuid);
    }

    get_or_create_assignment_for(person: Person): Assignment {
        let found = this.get_assignment_for(person);
        if (found == null) {
            let assignment = new Assignment(person);
            this._assignments.push(assignment);
            return assignment;
        }
        return found;
    }

    assignments_with_role(role: Role): Array<Assignment> {
        return this._assignments.filter(assignment => {
            for (let person_role of assignment.roles) {
                if (role.uuid == person_role.uuid) {
                    return true;
                }
            }
            return false;
        });
    }

    // order_people_by_role_layout_priority() {
    //     return this._assignments.sort((a1, a2) => {
    //         let maxlp1 = a1.max_role_layout_priority;
    //         let maxlp2 = a2.max_role_layout_priority;
    //         return maxlp1 < maxlp2 ? 1 : maxlp1 > maxlp2 ? -1 : 0;
    //     }).map(a => a.person);
    // }

    get people(): Array<Person> {
        return this._assignments.map(a => a.person);
    }

    get derived_roles(): Array<Role> {
        let all_roles = _.flatMap(this._assignments, (a: Assignment) => a.roles);
        return _.uniqBy(all_roles, r => r.uuid);
    }

    find_role(role_name: string) {
        if (isUndefined(role_name)) {
            return null;
        }
        return this.derived_roles.find(r => r.name.toLowerCase() == role_name.toLowerCase());
    }

    assignment_for(person: Person): Assignment {
        // This person must exist in the team.
        let p = this.team.find_person_in_team(person);
        if (!p) {
            throw new Error(`Person ${person.name} not found in the team. Can't add them to this service`);
        }

        // OK. This person is in the team.
        // Create an assignment (another way of saying "what are they gonna be doing?"
        return this.get_or_create_assignment_for(person)
    }

    remove_person(person: Person) {
        let assign = this.get_assignment_for(person);
        if (assign) {
            delete_from_array(this._assignments, assign);
        }
    }

    get roles_in_layout_order(): Array<ServiceRole> {
        return this.roles.sort((a, b) => {
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
        for (let service_role of this.roles_in_layout_order) {
            let rules = [];

            // Find any specific rules for this date.
            let role = service_role.role;
            rules = rules.concat(this.rules_for_role(role));

            // Ordering people sequentially
            let uws = new UsageWeightedSequential(this.assignments_with_role(role));
            rules.push(uws);

            rule_map.set(role, rules);
        }
        return rule_map;
    }

    private rules_for_role(role: Role) {
        return this.specific_role_rules.filter(r => {
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
        this.specific_role_rules.push(rule);
        // console.log("Rules now " + SafeJSON.stringify(this.rules));
    }

    get roles_in_layout_order_grouped(): Array<Array<ServiceRole>> {
        // Add all roles into a map
        let roles_in_order = this.roles_in_layout_order;
        let intermediate = new Map<number, Array<ServiceRole>>();
        // this.logger.info(`Sorting following roles: ${roles_in_order.join(",")}`);
        for (let role of roles_in_order) {
            if (!intermediate.has(role.layout_priority)) {
                intermediate.set(role.layout_priority, []);
            }
            intermediate.set(role.layout_priority, [...intermediate.get(role.layout_priority), role]);
        }

        // Turn into an array, sorted by priority
        let intermediate_keys = intermediate.keys();
        let keys = Array.from(intermediate_keys).sort((a, b) => {
            if (a < b) {
                return 1;
            }
            if (a > b) {
                return -1;
            }
            return 0;
        });
        let result = [];
        for (let key of keys) {
            let list = intermediate.get(key);
            result.push(list);
        }
        return result;
    }

    role_rules(): Map<Assignment, Array<Rule>> {
        let assignment_rule_map = new Map<Assignment, Array<Rule>>();
        for (let assignment of this._assignments) {
            assignment_rule_map.set(assignment, assignment.role_rules());
        }
        return assignment_rule_map;
    }

    add_role(role: Role, required: boolean = false, max_needed: number = 1, layout_priority: number = -1): ServiceRole {
        if (layout_priority == -1) {
            layout_priority = role.layout_priority;
        }
        let serviceRole = new ServiceRole(role, required, max_needed, layout_priority);
        let existingIndex = this.roles.findIndex(p => p.role.uuid == role.uuid);
        if (existingIndex != -1) {
            this.roles.splice(existingIndex, 1);
        }
        this.roles.push(serviceRole);
        return serviceRole;
    }

    service_role_matching(nextSuitableRoleForAssignment: Role): ServiceRole {
        let found = this.roles.find(p => p.role.uuid == nextSuitableRoleForAssignment.uuid);
        if (found) {
            return found;
        }
        return null;
    }
}

class EventStore extends BaseStore<Service> {
    events: Array<Service>;

    constructor() {
        super();
        this.events = new Array<Service>();
    }

    add_event_named(event_name: string, team: Team): Service {
        let service = new Service(event_name, team);
        this.events.push(service);
        return service;
    }
}

export {
    Service,
    ServiceRole,
    EventStore
}