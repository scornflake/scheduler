import {Person} from "./people";
import {AssignedToRoleCondition, ConditionalRule, Rule, SecondaryAction, WeightedRoles} from "./rule_based/rules";
import {action, computed} from "mobx";
import {check_if_undefined, delete_from_array} from "./common/base_model";
import {dayAndHourForDate} from "./common/date-utils";
import {ServiceRole} from "./service";

class Assignment {
    person: Person;

    role_weightings: Map<ServiceRole, number>;
    specific_roles: Map<string, Array<ServiceRole>>;

    private condition_rules: Array<ConditionalRule>;
    private secondary_action_list: Array<SecondaryAction>;

    constructor(person: Person = new Person()) {
        this.person = person;
        this.role_weightings = new Map<ServiceRole, number>();
        this.specific_roles = new Map<string, Array<ServiceRole>>();
        this.secondary_action_list = [];
        this.condition_rules = [];
    }

    @action
    add_role(r: ServiceRole, weighting = 1): Assignment {
        check_if_undefined(this.person, "Cannot add a nil or undefined person");
        check_if_undefined(r, "Cannot add a nil or undefined role");
        this.role_weightings.set(r, weighting);
        return this;
    }

    set_weight_for_role(r: ServiceRole, new_weight: number) {
        if (this.role_weightings.has(r)) {
            this.role_weightings.set(r, new_weight);
        }
    }

    weight_for_role(r: ServiceRole): number {
        let weight = this.role_weightings.get(r);
        if (weight) {
            return weight;
        }
        return 0;
    }

    @action
    remove_role(r: ServiceRole): Assignment {
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

    get role_names(): string {
        return this.roles.map(r => r.name).join(", ")
    }

    @computed
    get roles(): Array<ServiceRole> {
        let iterable = this.role_weightings.keys();
        return Array.from(iterable);
    }

    @computed
    get highest_role_layout_priority(): number {
        return this.roles.reduce((previousMax, role) => {
            return Math.max(previousMax, role.layout_priority);
        }, 0);
    }

    get name(): string {
        return this.person.name;
    }

    put_on_specific_role_for_date(role: ServiceRole, date: Date) {
        let key = dayAndHourForDate(date);
        if (!this.specific_roles.has(key)) {
            this.specific_roles.set(key, new Array<ServiceRole>());
        }
        let role_list = this.specific_roles.get(key);
        role_list.push(role);
    }

    specific_roles_for_date(date: Date): Array<ServiceRole> {
        let key = dayAndHourForDate(date);
        return this.specific_roles.get(key);
    }

    get max_role_layout_priority(): number {
        return this.roles.reduce((prev, role) => {
            return Math.max(prev, role.layout_priority);
        }, 0);
    }

    get conditional_rules(): Array<ConditionalRule> {
        return this.condition_rules;
    }

    get secondary_actions(): Array<SecondaryAction> {
        return this.secondary_action_list;
    }

    delete_rule(rule: Rule) {
        let list: Array<Rule> = this.conditional_rules;
        if (rule instanceof SecondaryAction) {
            list = this.secondary_actions;
        }
        delete_from_array(list, rule);
    }

    add_secondary_action(action: SecondaryAction) {
        if (action) {
            // Assign the owner
            action.owner = this.person;
            this.secondary_action_list.push(action);
        }
    }

    if_assigned_to(role: ServiceRole): ConditionalRule {
        this.add_role(role);

        let roleRule = new AssignedToRoleCondition(role);
        this.condition_rules.push(roleRule);
        return roleRule;
    }

    has_primary_role(role: ServiceRole) {
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