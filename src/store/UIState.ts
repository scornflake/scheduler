import {Person} from "../scheduling/people";
import {action, computed, observable} from "mobx";
import {Role} from "../scheduling/role";
import {Plan} from "../scheduling/plan";
import {ObjectWithUUID} from "../scheduling/common/base_model";
import {persisted} from "../providers/server/db-decorators";

class SavedState extends ObjectWithUUID {
    @observable
    @persisted()
    previous_sheet_id: string;

    @persisted()
    @observable previous_sheet_tab_id: number;

    @persisted()
    @observable google_sheet_id: string;

    @persisted()
    @observable google_sheet_tab_id: number;

    @persisted()
    @observable google_sheet_id_retrieved: boolean;

    @persisted()
    @observable login_token: string;

    @persisted()
    @observable selected_plan_uuid: string;

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
        this.saved_state = new SavedState('saved-state');
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

    select_plan(p: Plan) {
        if (p) {
            this.saved_state.selected_plan_uuid = p.uuid;
        } else {
            this.saved_state.selected_plan_uuid = null;
        }
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