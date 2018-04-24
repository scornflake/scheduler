import {FixedRoleOnDate, OnThisDate, Rule, UsageWeightedSequential, WeightedRoles} from "./rules";
import {Role, RolesStore} from "../tests/roles";
import {Logger} from "ionic-logging-service";
import {dayAndHourForDate, throwOnInvalidDate} from "../common/date-utils";
import {PeopleStore, Person} from "../people";
import {Exclusion, ScheduleAtDate} from "../common";
import {isUndefined} from "ionic-angular/util/util";
import {LoggingWrapper} from "../../common/logging-wrapper";

export class RuleFacts {
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

    private logger: Logger;

    constructor(people: PeopleStore, roles: RolesStore) {
        this.people = people;
        this.roles = roles;
        this.begin();

        this.exclusion_zones = new Map<Person, Array<Exclusion>>();
        this.usage_counts = new Map<Role, Map<Person, number>>();

        this.logger = LoggingWrapper.getLogger("scheduler.rules.facts");
    }

    copyUsageDataFrom(previous_facts: RuleFacts) {
        this.usage_counts = new Map<Role, Map<Person, number>>();
        for (let person of Array.from(previous_facts.exclusion_zones.keys())) {
            let zones = previous_facts.exclusion_zones.get(person);
            this.exclusion_zones.set(person, zones);
        }

        for (let key of Array.from(previous_facts.usage_counts.keys())) {
            let usage_count = previous_facts.usage_counts.get(key);
            this.usage_counts.set(key, usage_count);
        }
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
        if (isUndefined(date)) {
            this.logger.error("Cannot return a schedule for a null date");
            return null;
        }
        let dateAtHour = dayAndHourForDate(date);
        let schedule = this.dates.get(dateAtHour);
        if (schedule == null) {
            this.logger.info("Create new schedule for " + dateAtHour);
            schedule = new ScheduleAtDate(date);
            this.dates.set(dateAtHour, schedule);
            return schedule;
        } else {
            // this.logger.info("Reuse schedule for " + dateAtHour + " = " + date);
            return schedule;
        }
    }

    begin() {
        // This is all PickRules, for all roles
        this.all_pick_rules = this.roles.pick_rules(this.people);
        this.decision_depth = 0;
        // this.logPickRules();

        this.all_role_rules = this.roles.role_rules(this.people);
        this.dates = new Map<string, ScheduleAtDate>();
    }

    // private logPickRules() {
    //     this.logger.info("Pick rules:");
    //     this.all_pick_rules.forEach((list, role) => {
    //         this.logger.info(" - " + role.name);
    //         list.forEach(r => {
    //             this.logger.info(" --- " + r.constructor.name + " = " + JSON.stringify(r));
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
            this.logger.debug(text);
        }
        if (!this.decisions_for_date) {
            this.decisions_for_date = [];
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
            if (exclusion.overlap_with(new_exclusion)) {
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
            // this.logger.info("Using rule " + rule.constructor.name + ", " + JSON.stringify(rule) + " next...");
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

                        // Must be available
                        if (!this.is_person_available(possible_person, this.current_date, true)) {
                            // No need to add decision. This will be done automatically.
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
        if (role == null) {
            throw new Error("Role cannot be null here");
        }
        if (person == null) {
            throw new Error("Person cannot be null here");
        }
        if (!this.usage_counts.has(role)) {
            this.logger.debug("Creating new role counter for " + role.name);
            let new_count = new Map<Person, number>();
            this.usage_counts.set(role, new_count);
        }

        let by_person = this.usage_counts.get(role);
        if (!by_person.has(person)) {
            this.logger.info("Starting count at 0 for " + person.name);
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

    is_person_available(person: Person, date: Date, record_unavailability: boolean = false) {
        throwOnInvalidDate(date);
        if (person.is_unavailable_on(date)) {
            return false;
        }

        // Check for specific availability based on past placements
        return person.is_available(date, this, record_unavailability);
    }

    placements_for_person(person: Person, start_date: Date, end_date: Date) {
        let facts = this.filter(start_date, end_date);
        // this.logger.info(" - facts: " + JSON.stringify(facts));
        return facts.filter(fact => fact.includes_person(person));
    }

    index_of_person_in_role_group(person: Person, role: Role) {
        return 0;
    }

    use_this_person_in_role(person: Person, role: Role) {
        let person_counter = this.get_person_count_for_role(role, person);
        let current_count = person_counter.get(person);
        person_counter.set(person, (current_count + 1));
        // this.logger.info("Up to " + person_counter.get(person));
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
        this.add_decision("Recorded exclusion for " + person.name + ", " + role.name + " for " + Math.floor(exclusion.duration_in_days) + " days");
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

    place_person_in_role(person: Person,
                         role: Role,
                         date: Date,
                         record_usage_stats = true,
                         execute_conditionals = true,
                         decision_override: string = null): boolean {
        let specific_day = this.get_schedule_for_date(date);

        if (!specific_day.can_place_person_in_role(person, role)) {
            return false;
        }

        this.add_exclusion_for(person, role, date);
        specific_day.add_person(person, role);
        this.add_decision(decision_override == null ? "Placing " + person.name + " into " + role : decision_override);

        if (record_usage_stats) {
            this.use_this_person_in_role(person, role);
        }

        // Execute any conditional actions on the person
        if (execute_conditionals) {
            person.conditional_rules.forEach(r => {
                this.exec_sub_decision(() => {
                    r.run(this, person, role);
                });
            });
        }
        return true;
    }

    set_decisions_for(person: Person, role: Role, date: Date, clear_decisions: boolean = true) {
        let specific_day = this.get_schedule_for_date(date);
        specific_day.set_decisions(person, role, this.decisions_for_date);
        if (clear_decisions) {
            this.clear_decisions();
        }
    }

    clear_decisions() {
        this.decisions_for_date = [];
    }

    filter(start_date: Date, end_date: Date) {
        return Array.from(this.dates.values()).filter((schedule) => {
            return schedule.date >= start_date && schedule.date <= end_date;
        }).sort((s1, s2) => {
            return s1.date > s2.date ? 1 : (s1.date < s2.date ? -1 : 0);
        });
    }

}

