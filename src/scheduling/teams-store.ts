import {BaseStore} from "./common/base_model";
import {Role} from "./role";


class TeamsStore extends BaseStore<Role> {
    constructor() {
        super();
    }

    get teams(): Array<Role> {
        return this.items;
    }
}

export {
    TeamsStore
};
