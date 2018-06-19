import {Person} from "../scheduling/people";
import {action, computed, observable} from "mobx";
import {Role} from "../scheduling/role";
import {Plan} from "../scheduling/plan";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";

class SavedState extends ObjectWithUUID {
    @observable previous_sheet_id: string;
    @observable previous_sheet_tab_id: number;
    @observable google_sheet_id: string;
    @observable google_sheet_tab_id: number;
    @observable google_sheet_id_retrieved: boolean;
    @observable login_token: string;
    @observable private _selected_plan_uuid: string;

    @observable logged_in_person_uuid: string;

    @observable last_selected_date;
    private logger: Logger;

    constructor(uuid: string) {
        super(uuid);
        this.logger = LoggingWrapper.getLogger('model.savedstate');
    }

    @computed
    get have_previous_selection(): boolean {
        return this.previous_sheet_id != null && this.previous_sheet_tab_id != 0;
    }

    set selected_plan_uuid(value: string) {
        if (value != this._selected_plan_uuid) {
            this.logger.info(`Setting selected to Plan UUID : ${value}`);
            this._selected_plan_uuid = value;
        }
    }

    @computed
    get selected_plan_uuid(): string {
        return this._selected_plan_uuid;
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
    @observable private _saved_state: SavedState;

    constructor() {
        this.login_token_validated = false;
        this.signed_in_to_google = false;
        this._saved_state = new SavedState('saved-state');
    }

    get saved_state(): SavedState {
        return this._saved_state;
    }

    set saved_state(value: SavedState) {
        this._saved_state = value;
    }

    get foo(): boolean {
        return true;
    }

    @computed
    get signed_in(): boolean {
        let value = this._saved_state.login_token && this.login_token_validated;
        // console.log(`signed in: ${value}, token: ${this._saved_state.login_token}, valid: ${this.login_token_validated}`);
        return value;
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
        this._saved_state.clear_all_sheet_state();
    }

    logout() {
        this._saved_state.login_token = null;
        this.signed_in_to_google = false;
    }
}

export {
    UIStore,
    SavedState
}