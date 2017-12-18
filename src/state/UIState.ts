import {action, computed, observable} from "mobx-angular";
import {Person} from "./people";
import {Role} from "./roles";

class UIStore {
    @observable selected_person: Person;
    @observable selected_date: Date;
    @observable selected_role: Role;

    @observable signed_in: boolean;
    @observable google_sheet_id: string;
    @observable google_sheet_id_retrieved: boolean;

    constructor() {
        this.signed_in = false;
        this.google_sheet_id_retrieved = false;
        this.google_sheet_id = "";
    }

    @computed
    get have_selection(): boolean {
        return this.selected_person != null;
    }

    @action
    clear_selection() {
        this.selected_person = null;
    }

    @action("Select Person")
    select(person: Person, date: Date, role: Role) {
        this.selected_person = person;
        this.selected_date = date;
        this.selected_role = role;
    }
}

export {
    UIStore
}