import {Component, Input} from '@angular/core';
import {Rule} from "../../scheduling/rule_based/rules";
import {Assignment} from "../../scheduling/assignment";

@Component({
    selector: 'rule-details',
    templateUrl: 'rule-details.html'
})
export class RuleDetailsComponent {
    @Input('assignment') assignment: Assignment;

    constructor() {
    }

    rules_for_role() {
        if (!this.assignment) {
            return [];
        }
        let rules: Array<Rule> = this.assignment.conditional_rules;
        let actions = this.assignment.secondary_actions;
        return rules.concat(actions);
    }

    delete_rule(rule: any | Rule) {
        this.assignment.delete_rule(rule);
    }

}
