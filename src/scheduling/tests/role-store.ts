import {BaseStore} from "../common/base_model";
import {isUndefined} from "ionic-angular/util/util";
import {Role} from "../role";
import {action} from "mobx";

export class RolesStore extends BaseStore<Role> {
    constructor() {
        super();
    }

    get roles(): Array<Role> {
        return this.items.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
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

    find_role(role_name: string) {
        if (isUndefined(role_name) || role_name == null) {
            return null;
        }
        return this.roles.find(r => r.name.toLowerCase() == role_name.toLowerCase());
    }
}