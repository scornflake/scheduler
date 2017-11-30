import * as _ from 'lodash';
import {Role, RolesStore} from "../../state/roles";
import {PeopleStore, Person, Unavailablity} from "../../state/people";
import {Exclusion, ScheduleAtDate} from "../common";

class RuleExecution {
    object: any;
    trigger: Rule;

    constructor(obj, trigger: Rule) {
        this.object = obj;
        this.trigger = trigger;
    }

    get empty(): boolean {
        return this.object == null && this.trigger == null;
    }

    public static EMPTY() {
        return new RuleExecution(null, null);
    }
}

class RuleFacts {
    current_date: Date;
    decisions_for_date: Array<string>;

    private all_pick_rules: Map<Role, Array<Rule>>;
    private all_role_rules: Map<Person, Array<Rule>>;

    private exclusion_zones: Map<Person, Array<Exclusion>>;
    private people: PeopleStore;
    private roles: RolesStore;

    private usage_counts: Map<Role, Map<Person, number>>;

    // This is the schedule, as it's being built
    private dates: Map<string, ScheduleAtDate>;
    private decision_depth: number;

    constructor(people: PeopleStore, roles: RolesStore) {
        this.people = people;
        this.roles = roles;
        this.begin();
    }

    get schedule_dates(): Array<ScheduleAtDate> {
        return Array.from(this.dates.values());
    }

    exec_sub_decision(callback) {
        this.decision_depth++;
        try {
            callback();
        } finally {
            this.decision_depth--;
        }
    }

    get_schedule_for_date(date: Date): ScheduleAtDate {
        let dateAtHour = Unavailablity.dayAndHourForDate(date);
        let schedule = this.dates.get(dateAtHour);
        if (schedule == null) {
            console.log("Create new schedule for " + dateAtHour);
            schedule = new ScheduleAtDate(date);
            this.dates.set(dateAtHour, schedule);
            return schedule;
        } else {
            // console.log("Reuse schedule for " + dateAtHour + " = " + date);
            return schedule;
        }
    }

    begin() {
        // This is all PickRules, for all roles
        this.all_pick_rules = this.roles.pick_rules(this.people);
        this.decision_depth = 0;
        // this.logPickRules();

        this.all_role_rules = this.roles.role_rules(this.people);
        this.exclusion_zones = new Map<Person, Array<Exclusion>>();

        this.usage_counts = new Map<Role, Map<Person, number>>();
        this.dates = new Map<string, ScheduleAtDate>();
    }

    // private logPickRules() {
    //     console.log("Pick rules:");
    //     this.all_pick_rules.forEach((list, role) => {
    //         console.log(" - " + role.name);
    //         list.forEach(r => {
    //             console.log(" --- " + r.constructor.name + " = " + JSON.stringify(r));
    //         })
    //     });
    // }

    begin_new_role_group(role_group: Array<Role>) {
    }

    begin_new_role(date: Date) {
        this.current_date = date;
        this.decisions_for_date = [];
    }

    add_decision(text: string, log: boolean = true) {
        if (!text) {
            return;
        }
        text = "--- ".repeat(this.decision_depth) + text;
        if (log) {
            console.log(text);
        }
        this.decisions_for_date.push(text);
    }

    has_exclusion_for(date: Date, person: Person, role: Role): any[] {
        // Is this person unavailable on this date?
        if (person.is_unavailable_on(date)) {
            return [true, "unavailable"];
        }

        // Is this person excluded for this date?
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            return [false, "no exclusions for " + person.name];
        }

        // Does the exclusion zone for this person overlap with any existing?
        let availability = person.prefs.availability;
        let end_date = availability.get_end_date_from(date);
        let new_exclusion = new Exclusion(date, end_date, role);

        for (let exclusion of exclusions_for_person) {
            if (exclusion.overlap_with(new_exclusion, role)) {
                return [true, "overlap with existing " + exclusion];
            }
        }
        return [false, "clear!"];
    }

    get_next_suitable_person_for(role: Role): Person {
        // runs the pick rules for this role
        let pick_rules = this.all_pick_rules.get(role);
        if (!pick_rules) {
            return null;
        }
        for (let rule of pick_rules) {
            // console.log("Using rule " + rule.constructor.name + ", " + JSON.stringify(rule) + " next...");
            if (rule instanceof OnThisDate) {
                let result = rule.execute(this);
                if (result) return result;
            }
            if (rule instanceof UsageWeightedSequential) {
                let people = rule.execute(this, role);
                if (people.length) {
                    for (let possible_person of people) {
                        // can't already be in the role on this date
                        let [has_exclusion, reason] = this.has_exclusion_for(this.current_date, possible_person, role);
                        if (has_exclusion) {

                            this.add_decision(possible_person.name + " cant do it, they have an exclusion: " + reason);
                            continue;
                        }

                        return possible_person;
                    }

                }

                return null;
            }
        }
    }

    get_next_suitable_role_for_person(person: Person) {
        let role_rules = this.all_role_rules.get(person);
        if (!role_rules) {
            return null;
        }
        for (let rule of role_rules) {
            if (rule instanceof FixedRoleOnDate) {
                let result = rule.execute(this);
                if (result) return result;
            }
            if (rule instanceof WeightedRoles) {
                let result = rule.execute(this, person);
                return result[0];
            }
        }
        return null;
    }

    private get_person_count_for_role(role: Role, person: Person): Map<Person, number> {
        if (role == null
        ) {
            throw new Error("Role cannot be null here");
        }
        if (person == null) {
            throw new Error("Person cannot be null here");
        }
        if (!this.usage_counts.has(role)) {
            console.log("Creating new role counter for " + role.name);
            let new_count = new Map<Person, number>();
            this.usage_counts.set(role, new_count);
        }

        let by_person = this.usage_counts.get(role);
        if (!by_person.has(person)) {
            console.log("Starting count at 0 for " + person.name);
            by_person.set(person, 0);
        }
        return by_person;
    }

    number_of_times_role_used_by_person(role: Role, person: Person): number {
        if (role == null) {
            throw new Error("Role cannot be null here");
        }
        if (person == null) {
            throw new Error("Person cannot be null here");
        }
        return this.get_person_count_for_role(role, person).get(person);
    }

    total_number_of_times_person_placed_in_roles(person: Person, roles: Array<Role>): number {
        let total = 0;
        for (let role of roles) {
            let person_counter_for_role = this.get_person_count_for_role(role, person);
            total = total + person_counter_for_role.get(person);
        }
        return total;
    }

    index_of_person_in_role_group(person: Person, role: Role) {
        return 0;
    }

    use_this_person_in_role(person: Person, role: Role) {
        let person_counter = this.get_person_count_for_role(role, person);
        let current_count = person_counter.get(person);
        person_counter.set(person, (current_count + 1));
        // console.log("Up to " + person_counter.get(person));
    }

    add_exclusion_for(person: Person, role: Role, date: Date) {
        let exclusions_for_person = this.exclusion_zones.get(person);
        if (!exclusions_for_person) {
            exclusions_for_person = [];
        }

        // make the exclusion
        let availability = person.prefs.availability;
        let end_date = availability.get_end_date_from(date);

        let exclusion = new Exclusion(date, end_date, role);
        exclusions_for_person.push(exclusion);
        this.add_decision("Recorded exclusion for " + person.name + ", " + role.name + " for " + exclusion.duration_in_days + " days");
        this.exclusion_zones.set(person, exclusions_for_person);
    }

    is_person_in_exclusion_zone(person: Person, role: Role, date_for_row: Date) {
        let exclusion_zones = this.exclusion_zones.get(person);
        if (!exclusion_zones) {
            return false;
        }

        // lets find those zones relating directly to this role
        let zones_matching_role = exclusion_zones.filter(z => z.role.uuid == role.uuid);
        if (!zones_matching_role.length) {
            return false;
        }

        let containining_this_date = zones_matching_role.filter(z => z.includes_date(date_for_row));
        return containining_this_date.length > 0;
    }

    place_person_in_role(person: Person, role: Role, date: Date, record_usage_stats = true) {
        this.add_exclusion_for(person, role, date);

        let specific_day = this.get_schedule_for_date(date);
        specific_day.add_person(person, role);
        this.add_decision("Placing " + person.name + " into " + role);

        if (record_usage_stats) {
            this.use_this_person_in_role(person, role);
        }

        // Execute any conditional actions on the person
        person.conditional_rules.forEach(r => {
            this.exec_sub_decision(() => {
                r.run(this, person, role);
            });
        });
    }

    end_role(person: Person, role: Role, date: Date) {
        let specific_day = this.get_schedule_for_date(date);
        specific_day.set_facts(person, role, this.decisions_for_date);
        this.decisions_for_date = [];
    }
}

class Rule {
    priority: number;

    constructor(priority: number = 0) {
        this.priority = priority;
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
        this.weightedRoles = weightedRules;
        this.normalize_weights();
    }

    get roles_sorted_by_weight(): Array<Role> {
        return _.sortBy(Array.from(this.weightedRoles.keys()), (o) => {
            return this.weightedRoles.get(o);
        });
    }

    execute(state: RuleFacts, person: Person): Array<Role> {
        // sort by current score, highest first.
        let roles_in_weight_order = this.roles_sorted_by_weight;

        let roles = Array.from(this.weightedRoles.keys());
        let total_usages = state.total_number_of_times_person_placed_in_roles(person, roles);
        if (total_usages == 0) {
            return roles_in_weight_order;
        }

        // Sort based on realtime score
        return _.sortBy(roles_in_weight_order, role => {
            let role_weighting = this.weightedRoles.get(role);

            let current_score = state.number_of_times_role_used_by_person(role, person);
            let runtime_weighting = current_score / total_usages;
            // console.log(role.name + ", weight: " + role_weighting + ". Has score: " + current_score + ". Runtime weight: " + runtime_weighting);

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
        // console.log("Total weights: " + total_weight);
        this.weightedRoles.forEach((num, key) => {
            this.weightedRoles.set(key, num / total_weight);
        });
    }
}

class OnThisDate extends Rule {
    role: Role;
    date: Date;
    person: Person;

    constructor(date: Date, person: Person, role: Role, priority: number = 0) {
        super(priority);
        this.date = date;
        this.role = role;
        this.person = person;
    }

    execute(state: RuleFacts): Person {
        let hasPrimaryRole = this.person.has_primary_role(this.role);
        if (state.current_date == this.date && hasPrimaryRole) {
            return this.person;
        }
        return null;
    }
}

class UsageWeightedSequential extends Rule {
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

    execute(state: RuleFacts, role: Role): Array<Person> {
        // Sort by number
        return Array.from(this.usages.keys()).sort((p1: Person, p2: Person) => {
            let usageForP1 = state.number_of_times_role_used_by_person(role, p1);
            let usageForP2 = state.number_of_times_role_used_by_person(role, p2);
            if (usageForP1 < usageForP2) {
                return -1;
            } else if (usageForP1 > usageForP2) {
                return 1;
            }

            // Compare by index
            let p1Index = state.index_of_person_in_role_group(p1, role);
            let p2Index = state.index_of_person_in_role_group(p2, role);
            if (p1Index < p2Index) {
                return -1;
            } else if (p1Index > p2Index) {
                return 1;
            }
            return 0;
        });
    }
}

class DependentPlacementRule extends Rule {
    additional_roles: Array<Role>;

    constructor(additional_roles: Array<Role>) {
        super();
        this.additional_roles = additional_roles;
    }

    execute(state: RuleFacts, person: Person) {
        for (let role of this.additional_roles) {
            state.place_person_in_role(person, role, state.current_date);
        }
    }
}

class ConditionalRule extends Rule {
    private actions: Array<ConditionAction>;

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
        stat.add_decision("" + this.constructor.name + " executed, adding " + this.person + " to role " + this.role);
        stat.place_person_in_role(this.person, this.role, stat.current_date);
    }
}

export {
    UsageWeightedSequential,
    WeightedRoles,
    FixedRoleOnDate,
    RuleFacts,
    OnThisDate,
    AssignedToRoleCondition,
    ConditionalRule,
    ConditionAction,
    ScheduleOn,
    Rule
}