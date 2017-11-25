import {PeopleStore} from "./people";
import {RolesStore} from "./roles";
import {UIStore} from "./UIState";

class RootStore {
    people_store: PeopleStore;
    roles_store: RolesStore;
    ui_state: UIStore;

    constructor() {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.ui_state = new UIStore();
    }
}

export {RootStore}