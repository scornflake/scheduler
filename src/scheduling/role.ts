import {NamedObject} from "./base-types";
import {action, observable} from "mobx-angular";
import {ObservableMap} from "mobx";
import {RolesByPriority} from "./common/scheduler-store";
import {RoleResponse} from "../common/interfaces";

class Role extends NamedObject {
    @observable minimum_needed: number;
    @observable maximum_wanted: number;
    @observable layout_priority: number;
    @observable display_order: number;

    constructor(name: string, min_required: number = 1, maximum = 10, layout_priority = 1) {
        super();
        this.name = name;
        this.minimum_needed = min_required;
        this.maximum_wanted = maximum;
        this.layout_priority = layout_priority;
        this.display_order = layout_priority;
    }

    static roleFromRoleSet(r: RoleResponse) {
        let role = new Role(r.name, r.minimum_needed, r.maximum_needed, r.layout_priority);
        role.setDisplayOrder(r.display_order);
        return role;
    }

    @action setLayoutPriority(val: number) {
        this.layout_priority = val;
    }

    @action setDisplayOrder(val: number) {
        this.display_order = val;
    }

    @action setMinimumNeeded(val: number) {
        this.minimum_needed = val;
    }

    @action setMaximumWanted(val: number) {
        this.maximum_wanted = val;
    }

    get required(): boolean {
        return this.minimum_needed > 1;
    }

    valueOf() {
        return this.name;
    }

    get summary(): string {
        return `Min: ${this.minimum_needed}, Max: ${this.maximum_wanted}`;
    }

    toString() {
        return this.valueOf();
    }

    static sortRolesByPriority(roles: Array<Role>): RolesByPriority[] {
        let intermediate = new ObservableMap<number, Array<Role>>();
        for (let role of roles) {
            if (!intermediate.has(role.layout_priority)) {
                intermediate.set(role.layout_priority, []);
            }
            intermediate.set(role.layout_priority, [...intermediate.get(role.layout_priority), role]);
        }

        // Turn into an array, sorted by priority
        let intermediate_keys = intermediate.keys();
        let keys = Array.from(intermediate_keys).sort((a, b) => {
            if (a < b) {
                return 1;
            }
            if (a > b) {
                return -1;
            }
            return 0;
        });
        let result = observable([]);
        for (let key of keys) {
            let list = intermediate.get(key);
            result.push({priority: key, roles: list.sort()});
        }
        return result;

    }
}


export {Role};