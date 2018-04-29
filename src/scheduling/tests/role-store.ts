import {BaseStore} from "../common/base_model";
import {OnThisDate, Rule, UsageWeightedSequential} from "../rule_based/rules";
import {
    defaultAcousticGuitar,
    defaultBass,
    defaultComputerRole, defaultDrumsRole, defaultElectricGuitar,
    defaultKeysRole, defaultLeaderRole, defaultSaxRole,
    defaultSoundRole,
    defaultVocalsRole
} from "./sample-data";
import {isUndefined} from "ionic-angular/util/util";
import {PeopleStore, Person} from "../people";
import {Role} from "../role";

export class RolesStore extends BaseStore<Role> {
    @observable rules: Array<Rule>;

    constructor() {
        super();
        this.rules = [];
        this.add_objects_to_array([
            // defaultSpeakerRole,
            // defaultThemeRole,
            defaultLeaderRole,
            defaultSoundRole,
            defaultComputerRole,
            defaultKeysRole,
            defaultVocalsRole,
            defaultDrumsRole,
            defaultBass,
            defaultAcousticGuitar,
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
        if (isUndefined(role_name)) {
            return null;
        }
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
        // console.log("Rules now " + SafeJSON.stringify(this.rules));
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