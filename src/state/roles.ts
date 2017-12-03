import {action, observable} from "mobx-angular";
import {PeopleStore, Person} from "./people";
import {OnThisDate, Rule, UsageWeightedSequential} from "../scheduling/rule_based/rules";
import {BaseStore, ObjectWithUUID} from "./common";

export class Role extends ObjectWithUUID {
    @observable name: string;
    @observable maximum_count: number;
    @observable layout_priority: number;

    constructor(name: string, priority = 0) {
        super();
        this.name = name;
        this.maximum_count = 1;
        this.layout_priority = priority;
    }

    valueOf() {
        return "[" + this.name + "]";
    }
}

let leaderPriority = 11;
let soundPriority = 10; // 10
let instrumentPriority = 10;

let defaultLeaderRole = new Role("Worship Leader", leaderPriority);

let defaultSoundRole = new Role("Sound", soundPriority);
let defaultComputerRole = new Role("Computer", soundPriority);

let defaultBass = new Role("Bass", instrumentPriority);
let defaultDrumsRole = new Role("Drums", instrumentPriority);
let defaultKeysRole = new Role("Keys", instrumentPriority);
let defaultAccousticGuitar = new Role("Guitar (Accoustic)", instrumentPriority);
let defaultElectricGuitar = new Role("Guitar (Electric)", instrumentPriority);

let defaultVocalsRole = new Role("Vocals", instrumentPriority);
let defaultSaxRole = new Role("Sax", instrumentPriority);


defaultLeaderRole.maximum_count = 1;
defaultSoundRole.maximum_count = 1;
defaultComputerRole.maximum_count = 1;
defaultKeysRole.maximum_count = 1;

defaultAccousticGuitar.maximum_count = 2;

defaultVocalsRole.maximum_count = 3;

defaultElectricGuitar.maximum_count = 1;
defaultBass.maximum_count = 1;
defaultDrumsRole.maximum_count = 1;

export class RolesStore extends BaseStore<Role> {
    @observable rules: Array<Rule>;

    constructor() {
        super();
        this.rules = [];
        this.add_objects_to_array([
            defaultLeaderRole,
            defaultSoundRole,
            defaultComputerRole,
            defaultKeysRole,
            defaultVocalsRole,
            defaultDrumsRole,
            defaultBass,
            defaultAccousticGuitar,
            defaultElectricGuitar,
            defaultSaxRole
        ]);
    }

    get roles(): Array<Role> {
        return this.items;
    }

    @action
    removeAllRoles() {
        this.clear_all_objects_from_array();
    }

    @action
    addRole(r: Role): Role {
        return this.add_object_to_array(r);
    }

    @action
    addRoles(roles: Array<Role>) {
        this.add_objects_to_array(roles);
    }

    @action
    removeRole(r: Role) {
        this.remove_object_from_array(r);
    }

    get roles_in_layout_order_grouped(): Array<Array<Role>> {
        // Add all roles into a map
        let roles_in_order = this.roles_in_layout_order;
        let intermediate = new Map<number, Array<Role>>();
        for (let role of roles_in_order) {
            if (!intermediate.has(role.layout_priority)) {
                intermediate.set(role.layout_priority, []);
            }
            intermediate.set(role.layout_priority, [...intermediate.get(role.layout_priority), role]);
        }

        // Turn into an array
        let result = [];
        intermediate.forEach((list, key: number) => {
            result.push(list);
        });
        return result;
    }

    get roles_in_layout_order(): Array<Role> {
        return this.roles.sort((a: Role, b: Role) => {
            if (a.layout_priority < b.layout_priority) {
                return 1;
            } else if (a.layout_priority > b.layout_priority) {
                return -1;
            }
            return 0;
        });
    }

    find_role(role_name: string) {
        for (let role of this.roles) {
            if (role.name.toLowerCase() == role_name.toLowerCase()) {
                return role;
            }
        }
        return null;
    }

    pick_rules(people_store: PeopleStore): Map<Role, Array<Rule>> {
        let rule_map = new Map<Role, Array<Rule>>();
        for (let role of this.roles_in_layout_order) {
            let rules = [];

            // Find any specific rules for this date.
            rules = rules.concat(this.rules_for_role(role));

            // Ordering people sequentially
            let uws = new UsageWeightedSequential(people_store.people_with_role(role));
            rules.push(uws);

            rule_map.set(role, rules);
        }
        return rule_map;
    }

    role_rules(people_store: PeopleStore): Map<Person, Array<Rule>> {
        let rule_map = new Map<Person, Array<Rule>>();
        for (let person of people_store.people) {
            rule_map.set(person, person.role_rules());
        }
        return rule_map;
    }

    addPickRule(rule: Rule) {
        /*
        When putting rules together, user specified pick rules must come before the
        UWS rules when executing. So we make sure they have a higher priority.
        */
        rule.priority = 10;
        this.rules.push(rule);
        // console.log("Rules now " + JSON.stringify(this.rules));
    }

    private rules_for_role(role: Role) {
        return this.rules.filter(r => {
            if (r instanceof OnThisDate) {
                return r.role.uuid == role.uuid;
            }
            return false;
        });
    }
}

export {
    defaultLeaderRole,
    defaultSoundRole,
    defaultDrumsRole,
    defaultVocalsRole,
    defaultComputerRole,
    defaultKeysRole,
    defaultAccousticGuitar,
    defaultElectricGuitar,
    defaultBass,
    defaultSaxRole
}