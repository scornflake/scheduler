import {BaseStore, find_object_with_name} from "./common/base_model";
import {Team} from "./teams";


class TeamsStore extends BaseStore<Team> {
    constructor() {
        super();
    }

    get teams(): Array<Team> {
        return this.items;
    }


    find_team_with_name(name: string, fuzzy_match: boolean = false) {
        return find_object_with_name(this.items, name, fuzzy_match);
    }
}

export {
    TeamsStore
};
