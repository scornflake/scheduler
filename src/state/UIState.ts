import {action, computed, observable} from "mobx-angular";
import {Person} from "./people";
import {Role} from "./roles";

class SavedState {
    @observable google_sheet_id: string;
    @observable google_sheet_tab_id: number;
    @observable google_sheet_id_retrieved: boolean;
}

class UIStore {
    @observable selected_person: Person;
    @observable selected_date: Date;
    @observable selected_role: Role;

    @observable signed_in: boolean;
    @observable saved_state: SavedState;

    constructor() {
        this.signed_in = false;
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

    clear_sheet_state() {
        this.saved_state.google_sheet_id = "";
        this.saved_state.google_sheet_tab_id = 0;
        this.saved_state.google_sheet_id_retrieved = false;
    }
}

export {
    UIStore,
    SavedState
}