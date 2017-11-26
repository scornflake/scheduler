import {Person} from "../../state/people";
import includes from 'lodash/includes';
import {iterator} from "rxjs/symbol/iterator";

let priority_comparator = (r1: Rule, r2: Rule) => {
    return r1.priority < r2.priority ? -1 : r1.priority > r2.priority ? 1 : 0;
};

class RuleState {
    date: Date;
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

    addRule(rule: Rule) {
        if (!includes(this.rules, rule)) {
            this.rules.push(rule);
        }
    }

    execute(state: RuleState): Iterator<any> {
        this.current_iterator = null;
        this.iterators_to_iterate = [];
        for (let rule of this.rules.sort(priority_comparator)) {
            this.iterators_to_iterate.push(rule.execute(state));
        }

        this.current_iterator = this.iterators_to_iterate.pop();
        return {
            next: () => {
                // get the next value and maybe choose the next iterator
                let next_value = this.current_iterator.next();
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
}

class PickRules extends Rules {
}

class PickRule extends Rule {
    execute(state: RuleState): Iterator<Person> {
        throw new Error("Need implementation")
    }

    use_this_person(p: Person) {

    }
}

class OnThisDate extends PickRule {
    private date: Date;
    private person: Person;
    private haveReturnedValue: boolean;

    constructor(date: Date, person: Person, priority: number = 0) {
        super(priority);
        this.date = date;
        this.person = person;
        this.haveReturnedValue = false;
    }

    execute(state: RuleState): Iterator<Person> {
        return {
            next: () => {
                if (state.date == this.date && !this.haveReturnedValue) {
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
        this.usages.set(p, this.usages.get(p) + 1);
    }
}

export {
    UsageWeightedSequential,
    RuleState,
    OnThisDate,
    PickRule,
    PickRules,
    Rule
}