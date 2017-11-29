import {Person} from "../../state/people";
import includes from 'lodash/includes';
import {Role} from "../../state/roles";
import sum from 'lodash/sum';
import sumBy from 'lodash/sumBy';
import sortBy from 'lodash/sortBy';
import {isUndefined} from "ionic-angular/util/util";

let priority_comparator = (r1: Rule, r2: Rule) => {
    return r1.priority < r2.priority ? -1 : r1.priority > r2.priority ? 1 : 0;
};

class RuleState {
    date: Date;
    person: Person;
    decisions: Array<string>;

    valueOf() {
        return JSON.stringify(this);
    }

    start_fresh() {
        this.decisions = [];
    }

    add_decision(text: string, log: boolean = true) {
        if (!text) {
            return;
        }
        if (log) {
            console.log(text);
        }
        this.decisions.push(text);
    }

}

class Rule {
    priority: number;

    constructor(priority: number = 0) {
        this.priority = priority;
    }

    execute(state: RuleState): Iterator<any> {
        return {
            next: () => {
                return {done: true, value: null}
            }
        }
    }


}

class Rules {
    protected rules: Array<Rule>;
    protected current_iterator: Iterator<Person>;
    protected iterators_to_iterate: Array<Iterator<Person>>;

    constructor() {
        this.rules = [];
    }

    get length(): number {
        return this.rules.length;
    }

    addRules(rules: Array<Rule>) {
        for (let rule of rules) {
            this.addRule(rule);
        }
    }

    addRule(rule: Rule) {
        if (!includes(this.rules, rule)) {
            this.rules.push(rule);
        }
    }

    execute(state: RuleState): Iterator<any> {
        this.current_iterator = null;
        this.iterators_to_iterate = [];
        for (let rule of this.rules.sort(priority_comparator)) {
            let iterator = rule.execute(state);
            this.iterators_to_iterate.push(iterator);
        }

        this.current_iterator = this.iterators_to_iterate.pop();
        return {
            next: () => {
                if (this.iterators_to_iterate == null || isUndefined(this.iterators_to_iterate)) {
                    return {
                        done: true, value: null
                    }
                }

                // get the next value and maybe choose the next iterator
                let next_value = this.current_iterator.next();
                // console.log("Next value is: " + next_value.value);
                while (next_value.done) {
                    this.current_iterator = this.iterators_to_iterate.pop();
                    if (this.current_iterator == null) {
                        return {
                            done: true, value: null
                        }
                    }
                    next_value = this.current_iterator.next();
                }
                return next_value;
            }
        }
    }

    use_this_role(role: Role) {
        this.use_this(role);
    }

    use_this_person(person: Person) {
        this.use_this(person);
    }

    private use_this(thing: Object) {
        this.rules.forEach((r) => {
            if (r instanceof RoleRule && thing instanceof Role) {
                r.use_this_role(thing)
            }
            if (r instanceof PickRule && thing instanceof Person) {
                r.use_this_person(thing)
            }
        });
    }
}

class RoleRule extends Rule {
    execute(state: RuleState): Iterator<Role> {
        throw new Error("Need implementation")
    }

    use_this_role(r: Role) {
    }
}

class Score {
    weighting: number; // 0..1
    usage_count: number; // number of times this element has been used

    constructor(weighting, score = 0) {
        this.weighting = weighting;
        this.usage_count = 0;
    }

    valueOf() {
        return "Weighting: " + this.weighting + ", usage: " + this.usage_count;
    }
}

class FixedRoleOnDate extends RoleRule {
    date: Date;
    role: Role;
    private haveReturnedValue: boolean;

    constructor(date: Date, r: Role, priority = 0) {
        super(priority);
        this.date = date;
        this.role = r;
        this.haveReturnedValue = false;
    }

    execute(state: RuleState): Iterator<Role> {
        return {
            next: () => {
                // console.log("Execute for date: " + this.date + ". Run yet: " + this.haveReturnedValue);
                if (this.date == state.date && !this.haveReturnedValue) {
                    this.haveReturnedValue = true;
                    return {
                        done: false,
                        value: this.role
                    }
                }

                return {
                    done: true, value: null
                }
            }
        };
    }
}

class WeightedRoles extends RoleRule {
    weightedRoles: Map<Role, number>;
    scoring: Map<Role, Score>;

    constructor(weightedRules: Map<Role, number>) {
        super();
        this.weightedRoles = weightedRules;
        this.clearScores();
        this.normalizeWeights();
    }

    private clearScores() {
        this.scoring = new Map<Role, Score>();
    }

    get roles_sorted_by_score(): Array<Role> {
        return sortBy(Array.from(this.weightedRoles.keys()), (o) => {
            return this.score_for_role(o).usage_count;
        });
    }

    get roles_sorted_by_weight(): Array<Role> {
        return sortBy(Array.from(this.weightedRoles.keys()), (o) => {
            return this.weightedRoles.get(o);
        });
    }

    execute(state: RuleState): Iterator<Role> {
        return {
            next: () => {
                // sort by current score, highest first.
                let roles_in_weight_order = this.roles_sorted_by_weight;
                let total_usages = this.total_uses;

                // console.log("Total usages: " + total_usages);

                if (total_usages == 0) {
                    return {
                        done: false,
                        value: roles_in_weight_order[0]
                    }
                }

                // Choose the next role
                for (let role of roles_in_weight_order) {
                    let role_weighting = this.weightedRoles.get(role);

                    let current_score = this.score_for_role(role);
                    let runtime_weighting = current_score.usage_count / total_usages;
                    // console.log(role.name + ", weight: " + role_weighting + ". Has score: " + current_score + ". Runtime weight: " + runtime_weighting);
                    if (runtime_weighting <= role_weighting) {
                        return {
                            done: false,
                            value: role
                        }
                    }
                }

                return {done: true, value: null}
            }
        }
    }

    get total_uses(): number {
        return sumBy(Array.from(this.scoring.values(), (o) => o.usage_count))
    }

    score_for_role(r: Role): Score {
        let weighting = this.weightedRoles.get(r);
        if (isUndefined(weighting)) {
            throw Error("No weighting for this role, " + r.name);
        }
        if (this.scoring.has(r)) {
            return this.scoring.get(r);
        }
        return new Score(weighting);
    }

    use_this_role(r: Role) {
        let score = this.score_for_role(r);
        console.log("Increment score for '" + r.name + "' from " + score.usage_count + " to " + (score.usage_count + 1));
        score.usage_count++;
        this.scoring.set(r, score);
    }

    private normalizeWeights() {
        let total_weight: number = sum(Array.from(this.weightedRoles.values()));
        // console.log("Total weights: " + total_weight);
        this.weightedRoles.forEach((num, key) => {
            this.weightedRoles.set(key, num / total_weight);
        });
    }
}

class PickRule extends Rule {
    execute(state: RuleState): Iterator<Person> {
        throw new Error("Need implementation")
    }

    use_this_person(p: Person) {
    }
}

class OnThisDate extends PickRule {
    role: Role;
    date: Date;
    person: Person;

    private haveReturnedValue: boolean;

    constructor(date: Date, person: Person, role: Role, priority: number = 0) {
        super(priority);
        this.date = date;
        this.role = role;
        this.person = person;
        this.haveReturnedValue = false;
    }

    execute(state: RuleState): Iterator<Person> {
        return {
            next: () => {
                let hasPrimaryRole = this.person.has_primary_role(this.role);
                if (state.date == this.date && hasPrimaryRole && !this.haveReturnedValue) {
                    this.haveReturnedValue = true;
                    return {
                        done: false,
                        value: this.person
                    }
                }
                return {
                    done: true,
                    value: null
                }
            }
        }
    }
}

class UsageWeightedSequential extends PickRule {
    private usages: Map<Person, number>;
    private original_index: Map<Person, number>;

    constructor(people: Array<Person>, priority: number = 0) {
        super(priority);
        this.usages = new Map<Person, number>();
        this.original_index = new Map<Person, number>();

        people.forEach((p, index) => {
            this.usages.set(p, 0);
            this.original_index.set(p, index);
        });
    }

    execute(state: RuleState): Iterator<Person> {
        // Sort by number
        let peopleInUsageOrder = Array.from(this.usages.keys()).sort((p1: Person, p2: Person) => {
            let usageForP1 = this.usages.get(p1);
            let usageForP2 = this.usages.get(p2);
            if (usageForP1 < usageForP2) {
                return -1;
            } else if (usageForP1 > usageForP2) {
                return 1;
            }

            // Compare by index
            let p1Index = this.original_index.get(p1);
            let p2Index = this.original_index.get(p2);
            if (p1Index < p2Index) {
                return -1;
            } else if (p1Index > p2Index) {
                return 1;
            }
            return 0;
        });
        if (peopleInUsageOrder.length > 0) {
            return peopleInUsageOrder.values();
        }
        return null;
    }

    use_this_person(p: Person) {
        let existing = this.usages.get(p);
        console.log("Increment usage for " + p.name + " from " + existing + " to " + (existing + 1));
        this.usages.set(p, existing + 1);
    }
}

export {
    UsageWeightedSequential,
    WeightedRoles,
    FixedRoleOnDate,
    RuleState,
    OnThisDate,
    PickRule,
    Rules,
    Rule
}