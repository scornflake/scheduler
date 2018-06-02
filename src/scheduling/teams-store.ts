import {BaseStore, find_object_with_name} from "./common/base_model";
import {Role} from "./role";


class TeamsStore extends BaseStore<Role> {
    constructor() {
        super();
    }

    get teams(): Array<Role> {
        return this.items;
    }


    find_team_with_name(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.items, name, fuzzy_match);
    }
}

export {
    TeamsStore
};
