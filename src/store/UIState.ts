import {Role} from "../scheduling/role";
import {Person} from "../scheduling/people";

class SavedState {
    @observable previous_sheet_id: string;
    @observable previous_sheet_tab_id: number;

    @observable google_sheet_id: string;
    @observable google_sheet_tab_id: number;
    @observable google_sheet_id_retrieved: boolean;

    @observable login_token: string;

    @computed
    get have_previous_selection(): boolean {
        return this.previous_sheet_id != null && this.previous_sheet_tab_id != 0;
    }

    @action
    clear_previous_sheet_selection() {
        this.previous_sheet_id = null;
        this.previous_sheet_tab_id = 0;
    }

    @action
    clear_all_sheet_state() {
        this.google_sheet_id = "";
        this.google_sheet_tab_id = 0;
        this.google_sheet_id_retrieved = false;
        this.clear_previous_sheet_selection();
    }
}

class UIStore {
    /*
    Transient state
     */
    @observable selected_person: Person;
    @observable selected_date: Date;
    @observable selected_role: Role;

    @observable signed_in_to_google: boolean;
    @observable login_token_validated: boolean;

    /*
    Saved state
     */
    @observable saved_state: SavedState;

    constructor() {
        this.login_token_validated = false;
        this.signed_in_to_google = false;
        this.saved_state = new SavedState();
    }

    @computed
    get signed_in(): boolean {
        return this.saved_state.login_token && this.login_token_validated;
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
        this.saved_state.clear_all_sheet_state();
    }

    logout() {
        this.saved_state.login_token = null;
        this.signed_in_to_google = false;
    }
}

export {
    UIStore,
    SavedState
}