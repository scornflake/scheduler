import {Person} from "./people";
import {AssignedToRoleCondition, ConditionalRule, Rule, SecondaryAction, WeightedRoles} from "./rule_based/rules";
import {action, computed, observable} from "mobx-angular";
import {check_if_undefined, delete_from_array} from "./common/base_model";
import {dayAndHourForDate} from "./common/date-utils";
import {Role} from "./role";
import {IAssignment} from "./shared";
import {ObjectWithUUID} from "./base-types";

class Assignment extends ObjectWithUUID implements IAssignment {
    @observable person: Person;

    @observable role_weightings: Map<Role, number>;
    @observable specific_roles: Map<string, Array<Role>>;

    @observable private condition_rules: Array<ConditionalRule>;
    @observable private secondary_action_list: Array<SecondaryAction>;

    constructor(person: Person = new Person()) {
        super();
        this.person = person;
        this.role_weightings = new Map<Role, number>();
        this.specific_roles = new Map<string, Array<Role>>();
        this.secondary_action_list = [];
        this.condition_rules = [];
    }

    @action
    addRole(r: Role, weighting = 1): Assignment {
        check_if_undefined(this.person, "Cannot add a nil or undefined person");
        check_if_undefined(r, "Cannot add a nil or undefined role");
        this.role_weightings.set(r, weighting);
        return this;
    }

    @action
    set_weight_for_role(r: Role, new_weight: number) {
        if (this.role_weightings.has(r)) {
            this.role_weightings.set(r, new_weight);
        }
    }

    weight_for_role(r: Role): number {
        let weight = this.role_weightings.get(r);
        if (weight) {
            return weight;
        }
        return 0;
    }

    @action
    remove_role(r: Role): Assignment {
        this.role_weightings.delete(r);
        return this;
    }

    role_rules(): Array<Rule> {
        let rules = [];

        // TODO: Hmm. Could add unavailability dates as rules?
        // Have a rule that returns NO roles if the person is unavailable.
        // Could do that on the Pick as well. Here might be a little cleaner, model wise.

        // Add in weighted role distribution
        let weighting = new WeightedRoles(this.role_weightings);
        rules.push(weighting);

        return rules;
    }

    @computed
    get role_names(): string {
        return this.roles.map(r => r.name).join(", ")
    }

    @computed
    get roles(): Array<Role> {
        let iterable = this.role_weightings.keys();
        return Array.from(iterable);
    }

    @computed
    get highest_role_layout_priority(): number {
        return this.roles.reduce((previousMax, role) => {
            return Math.max(previousMax, role.layout_priority);
        }, 0);
    }

    @computed
    get name(): string {
        return this.person.name;
    }

    @action
    put_on_specific_role_for_date(role: Role, date: Date) {
        let key = dayAndHourForDate(date);
        if (!this.specific_roles.has(key)) {
            this.specific_roles.set(key, new Array<Role>());
        }
        let role_list = this.specific_roles.get(key);
        role_list.push(role);
    }

    specific_roles_for_date(date: Date): Array<Role> {
        let key = dayAndHourForDate(date);
        return this.specific_roles.get(key);
    }

    @computed
    get max_role_layout_priority(): number {
        return this.roles.reduce((prev, role) => {
            return Math.max(prev, role.layout_priority);
        }, 0);
    }

    @computed
    get conditional_rules(): Array<ConditionalRule> {
        return this.condition_rules;
    }

    @computed
    get secondary_actions(): Array<SecondaryAction> {
        return this.secondary_action_list;
    }

    @action
    delete_rule(rule: Rule) {
        let list: Array<Rule> = this.conditional_rules;
        if (rule instanceof SecondaryAction) {
            list = this.secondary_actions;
        }
        delete_from_array(list, rule);
    }

    @action
    add_secondary_action(action: SecondaryAction) {
        if (action) {
            // Assign the owner
            action.owner = this.person;
            this.secondary_action_list.push(action);
        }
    }

    @action
    if_assigned_to(role: Role): ConditionalRule {
        this.addRole(role);

        let roleRule = new AssignedToRoleCondition(role);
        this.condition_rules.push(roleRule);
        return roleRule;
    }

    hasPrimaryRole(role: Role) {
        let matching_roles = this.roles.filter(r => {
            return r.uuid == role.uuid;
        });
        return matching_roles.length > 0;
    }

    valueOf() {
        return `${this.name} doing [${this.roles.join(",")}]`;
    }
}

export {
    Assignment
}