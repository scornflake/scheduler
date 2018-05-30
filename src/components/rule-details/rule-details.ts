import {Component, Input} from '@angular/core';
import {Rule} from "../../scheduling/rule_based/rules";
import {Person} from "../../scheduling/people";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'rule-details',
    templateUrl: 'rule-details.html'
})
export class RuleDetailsComponent {
    @Input('person') person: Person;
    @Input('role') role: Role;

    constructor() {
    }

    rules_for_role() {
        if (!this.person) {
            return [];
        }
        let rules: Array<Rule> = this.person.conditional_rules;
        let actions = this.person.secondary_actions;
        return rules.concat(actions);
    }

    delete_rule(rule: any | Rule) {
        this.person.delete_rule(rule);
    }

}
