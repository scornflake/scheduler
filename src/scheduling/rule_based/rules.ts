import * as _ from 'lodash';
import {Role} from "../role";
import {Person} from "../people";
import {Logger} from "ionic-logging-service";
import {RuleFacts} from "./rule-facts";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Availability} from "../availability";
import {daysBetween, ScheduleAtDate} from "../shared";
import {ScheduleWithRules} from "./scheduler";
import {Assignment} from "../assignment";

class RuleExecution {
    object: any;
    trigger: Rule;

    private logger: Logger;

    constructor(obj, trigger: Rule) {
        this.object = obj;
        this.trigger = trigger;
        this.logger = LoggingWrapper.getLogger("scheduler.rules");
    }

    get empty(): boolean {
        return this.object == null && this.trigger == null;
    }

    public static EMPTY() {
        return new RuleExecution(null, null);
    }
}

class Rule {
    priority: number;

    constructor(priority: number = 0) {
        this.priority = priority;
    }

    /*
    Clear our any temporary state.
    This is called once per schedule creation.
     */
    public prepare_for_execution() {
    }

    get title() {
        return "title";
    }

    get description() {
        return "description";
    }

    toString() {
        return this.description;
    }
}

class FixedRoleOnDate extends Rule {
    date: Date;
    role: Role;

    constructor(date: Date, r: Role, priority = 0) {
        super(priority);
        this.date = date;
        this.role = r;
    }

    execute(state: RuleFacts): Role {
        if (this.date == state.current_date) {
            return this.role;
        }
        return null;
    }
}

class WeightedRoles extends Rule {
    weightedRoles: Map<Role, number>;

    constructor(weightedRules: Map<Role, number>) {
        super();
        this.weightedRoles = new Map<Role, number>(weightedRules);
        this.normalize_weights();
    }

    get roles_sorted_by_weight(): Array<Role> {
        return _.sortBy(Array.from(this.weightedRoles.keys()), (o) => {
            return this.weightedRoles.get(o);
        });
    }

    execute(state: RuleFacts, assignment: Assignment): Array<Role> {
        // sort by current score, highest first.
        let roles_in_weight_order = this.roles_sorted_by_weight;

        let roles = Array.from(this.weightedRoles.keys());
        let total_usages = state.total_number_of_times_person_placed_in_roles(assignment, roles);
        if (total_usages == 0) {
            return roles_in_weight_order;
        }

        // Sort based on realtime score
        return _.sortBy(roles_in_weight_order, role => {
            let role_weighting = this.weightedRoles.get(role);

            let current_score = state.number_of_times_role_used_by_person(role, assignment);
            let runtime_weighting = current_score / total_usages;
            // this.logger.info(role.name + ", weight: " + role_weighting + ". Has score: " + current_score + ". Runtime weight: " + runtime_weighting);

            if (runtime_weighting < role_weighting) {
                return -1;
            } else if (runtime_weighting > role_weighting) {
                return 1;
            }
            return 0;
        });
    }

    private normalize_weights() {
        let total_weight: number = _.sum(Array.from(this.weightedRoles.values()));
        // this.logger.info("Total weights: " + total_weight);
        this.weightedRoles.forEach((num, key) => {
            this.weightedRoles.set(key, num / total_weight);
        });
    }
}

class OnThisDate extends Rule {
    role: Role;
    date: Date;
    assignment: Assignment;

    constructor(date: Date, assignment: Assignment, role: Role, priority: number = 0) {
        super(priority);
        this.date = date;
        this.role = role;
        this.assignment = assignment;
    }

    execute(state: RuleFacts): Assignment {
        let hasPrimaryRole = this.assignment.has_primary_role(this.role);
        if (state.current_date == this.date && hasPrimaryRole) {
            return this.assignment;
        }
        return null;
    }
}

class UsageWeightedSequential extends Rule {
    private usages: Map<Assignment, number>;
    private original_index: Map<Assignment, number>;

    constructor(assignments: Array<Assignment>, priority: number = 0) {
        super(priority);
        this.usages = new Map<Assignment, number>();
        this.original_index = new Map<Assignment, number>();

        assignments.forEach((p, index) => {
            this.usages.set(p, 0);
            this.original_index.set(p, index);
        });
    }

    execute(state: RuleFacts, role: Role): Array<Assignment> {
        // Sort by number
        return Array.from(this.usages.keys()).sort((a1, a2) => {
            let usageForP1 = state.number_of_times_role_used_by_person(role, a1);
            let usageForP2 = state.number_of_times_role_used_by_person(role, a2);
            if (usageForP1 < usageForP2) {
                return -1;
            } else if (usageForP1 > usageForP2) {
                return 1;
            }

            // Compare by index
            let p1Index = state.index_of_person_in_role_group(a1.person, role);
            let p2Index = state.index_of_person_in_role_group(a2.person, role);
            if (p1Index < p2Index) {
                return -1;
            } else if (p1Index > p2Index) {
                return 1;
            }
            return 0;
        });
    }
}

class ConditionalRule extends Rule {
    actions: Array<ConditionAction>;

    constructor() {
        super();
        this.actions = [];
    }

    condition(stat: RuleFacts, person: Person, role: Role) {
        return false;
    }

    run(stat: RuleFacts, person: Person, role: Role) {
        if (this.condition(stat, person, role)) {
            _.sortBy(this.actions, o => o.priority).forEach(r => {
                r.executeAction(stat, person, role);
            });
        }
    }

    then(action: ConditionAction) {
        this.actions.push(action);
    }
}

class AssignedToRoleCondition extends ConditionalRule {
    private role: Role;

    constructor(role: Role) {
        super();
        this.role = role;
    }

    condition(stat: RuleFacts, person: Person, role: Role): boolean {
        return this.role.uuid == role.uuid;
    }

    get title() {
        return `When on ${this.role}`
    }

    get description() {
        return this.actions.join(", ")
    }
}

class ConditionAction extends Rule {
    executeAction(stat: RuleFacts, person: Person, role: Role) {
    }
}

class ScheduleOn extends ConditionAction {
    private person: Person;
    private role: Role;

    constructor(person: Person, role: Role) {
        super();
        this.person = person;
        this.role = role;
    }

    executeAction(stat: RuleFacts, person: Person, role: Role) {
        let assignment = stat.service.get_assignment_for(person);
        if (stat.place_person_in_role(assignment, this.role, stat.current_date)) {
            stat.add_decision(`${this.constructor.name} executed, adding ${this.person} to role ${this.role}`);
        } else {
            stat.add_decision(`Couldn't place ${this.person} in role, the role is full`);
        }
    }

    get title() {
        return `If on ${this.person}`
    }

    get description() {
        return `Also be on ${this.role}`;
    }
}

class SecondaryAction extends Rule {
    owner: Person;

    execute(schedule_at_date: ScheduleAtDate, schedule: ScheduleWithRules) {

    }
}

class TryToScheduleWith extends SecondaryAction {
    private readonly other_person: Person;
    private readonly max_number_of_times: number;

    private reach: Availability;
    private success_executions: number = 0;
    private logger: Logger;

    constructor(other_person: Person, reach: Availability, max_number = 99999) {
        super();
        this.other_person = other_person;
        this.reach = reach;
        this.max_number_of_times = max_number;
        this.logger = LoggingWrapper.getLogger("scheduler.rules.tryto");
    }

    prepare_for_execution() {
        super.prepare_for_execution();
        this.success_executions = 0;
    }

    execute(schedule_at_date: ScheduleAtDate, schedule: ScheduleWithRules) {
        // If this line includes a use of self, does it also include a use of the other person?
        let score_for_owner = schedule_at_date.score_for_person(this.owner);

        if (score_for_owner) {
            let score_for_other = schedule_at_date.score_for_person(this.other_person);
            if (!score_for_other) {
                //
                // TODO: mark somehow that this is a movement, and it shouldn't be reprocessed?
                // Only because we might get into a situation where we move someone, only to move them again with the next rule
                // or a secondary action for someone else

                // Is there some place in the schedule where we could move the person, within the allowed threshold?
                let closest = schedule.closest_schedule_date(schedule_at_date.date, (s): number | boolean => {
                    // Not interested in the same one
                    if (s == schedule_at_date) {
                        return false;
                    }
                    // This SD must include the other person
                    if (!s.includes_person(this.other_person)) {
                        return false;
                    }

                    // It's not us, and it does contain the other person! Yay!
                    return Math.abs(daysBetween(schedule_at_date.date, s.date));
                });

                if (closest && this.success_executions < this.max_number_of_times) {
                    let roles_of_owner = score_for_owner.roles;
                    this.logger.info(`We should try to move ${this.owner} (${roles_of_owner.join(",")}) because they are not on with ${this.other_person}`);
                    this.logger.info(` - Try to move them to ${closest.date.toDateString()}`);

                    let reason = `Moved from ${schedule_at_date.date.toDateString()} to be with ${this.other_person.name}`;
                    schedule_at_date.move_person(this.owner, closest, reason);

                    this.success_executions++;
                }
            }
        }
    }

    get title() {
        return `If scheduled on...`;
    }

    get description() {
        return `Try to team with ${this.other_person.initials} within ${this.reach.description(true)}, max ${this.max_number_of_times}`;
    }
}

export {
    UsageWeightedSequential,
    WeightedRoles,
    FixedRoleOnDate,
    OnThisDate,
    AssignedToRoleCondition,
    ConditionalRule,
    ConditionAction,
    ScheduleOn,
    SecondaryAction,
    TryToScheduleWith,
    Rule
}