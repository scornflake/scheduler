import {computed, observable} from "mobx-angular";
import {Person} from "./people";
import {Role} from "./roles";

class UIStore {
    @observable selected_person: Person;
    @observable selected_date: Date;
    @observable selected_role: Role;

    constructor() {
    }

    @computed
    get have_selection(): boolean {
        return this.selected_person != null;
    }
}

export {
    UIStore
}