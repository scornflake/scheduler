import {delete_from_array} from "./common/base_model";
import {Assignment} from "./assignment";
import {Person} from "./people";
import {OnThisDate, Rule, UsageWeightedSequential} from "./rule_based/rules";
import {isUndefined} from "ionic-angular/util/util";
import {daysBetween} from "./shared";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Team} from "./teams";
import {Role} from "./role";
import {NamedObject} from "./base-types";
import {action, computed, observable} from "mobx-angular";
import {addDaysToDate, dateForISODateString} from "./common/date-utils";
import {ObservableMap} from "mobx";

class Plan extends NamedObject {
    @observable start_date: Date;

    @observable end_date: Date;

    @observable days_per_period: number;

    @observable roles: Array<Role>;

    @observable team: Team;

    // This is the people available for this service/event
    @observable private _assignments: Array<Assignment>;

    // These are the rules applied to the people doing this service/event
    // Used at runtime only (I think?)
    private specific_role_rules: Array<Rule>;

    private logger: Logger;

    constructor(name: string, team: Team) {
        super(name);
        this.logger = LoggingWrapper.getLogger("model.plan");

        this.start_date = new Date();
        this.end_date = addDaysToDate(this.start_date, 30);
        this.team = team;
        this.roles = new Array<Role>();

        this._assignments = new Array<Assignment>();
        this.specific_role_rules = new Array<Rule>();

        // this.manual_layouts = new Map<Date, Role>();
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

    @computed get assignments(): Array<Assignment> {
        return this._assignments;
    }

    set assignments(new_assigns) {
        this._assignments = new_assigns;
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
        return this.assignments.filter(assignment => {
            for (let assignmentRole of assignment.roles) {
                if (role.uuid == assignmentRole.uuid) {
                    return true;
                }
            }
            return false;
        });
    }

    @action setEndDateFromISO(dateString: string) {
        this.end_date = dateForISODateString(dateString);
    }

    @action setStartDateFromISO(dateString: string) {
        this.start_date = dateForISODateString(dateString);
    }

    @computed get people(): Array<Person> {
        return this._assignments.map(a => a.person);
    }

    find_role(role_name: string): Role {
        if (isUndefined(role_name) || role_name == null) {
            return null;
        }
        return this.roles.find(r => r.name.toLowerCase() == role_name.toLowerCase());
    }

    find_role_by_uuid(uuid: string): Role {
        if (isUndefined(uuid)) {
            return null;
        }
        return this.roles.find(r => r.uuid == uuid);
    }

    assignmentFor(person: Person): Assignment {
        // This person must exist in the team.
        let p = this.team.findPersonInTeam(person);
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

    @computed
    get roles_in_layout_order(): Array<Role> {
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
        return this.specific_role_rules.filter(r => {
            if (r instanceof OnThisDate) {
                return r.role.uuid == role.uuid;
            }
            return false;
        });
    }

    @action
    addPickRule(rule: Rule) {
        /*
        When putting rules together, user specified pick rules must come before the
        UWS rules when executing. So we make sure they have a higher priority.
        */
        rule.priority = 10;
        this.specific_role_rules.push(rule);
        // console.log("Rules now " + SafeJSON.stringify(this.rules));
    }

    @computed
    get roles_in_layout_order_grouped(): Array<Array<Role>> {
        // Add all roles into a map
        let roles_in_order = this.roles_in_layout_order;
        let intermediate = new ObservableMap<number, Array<Role>>();
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
        let result = observable([]);
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

    addRole(sr: Role): Role {
        let existingIndex = this.roles.findIndex(r => r.name == sr.name);
        if (existingIndex != -1) {
            this.roles.splice(existingIndex, 1);
        }
        this.roles.push(sr);
        return sr;
    }

    removeRole(role: Role) {
        let existingIndex = this.roles.findIndex(r => r.uuid == role.uuid);
        if (existingIndex != -1) {
            this.roles.splice(existingIndex, 1);
        }
    }
}

export {
    Plan,
}