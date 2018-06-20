import {Person} from "../scheduling/people";
import {action, computed, observable} from "mobx";
import {Role} from "../scheduling/role";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";

class Preferences extends ObjectWithUUID {
    @observable previous_sheet_id: string;
    @observable previous_sheet_tab_id: number;
    @observable google_sheet_id: string;
    @observable google_sheet_tab_id: number;
    @observable google_sheet_id_retrieved: boolean;
    @observable login_token: string;
    @observable selected_plan_uuid: string;

    @observable logged_in_person_uuid: string;

    @observable last_selected_date;
    private logger: Logger;

    constructor(uuid: string) {
        super(uuid);
        this.logger = LoggingWrapper.getLogger('model.preferences');
    }

    @computed
    get have_previous_selection(): boolean {
        return this.previous_sheet_id != null && this.previous_sheet_tab_id != 0;
    }

    @action clearLogin() {
        this.login_token = null;
        this.logged_in_person_uuid = null;
        this.selected_plan_uuid = null;
    }

    @action setLoginToken(value: string) {
        this.login_token = value;
    }

    @action setLoggedInPersonUUID(value: string) {
        this.logged_in_person_uuid = value;
    }

    @action setSelectedPlanUUID(value: string) {
        if (value != this.selected_plan_uuid) {
            this.logger.debug(`Setting selected plan UUID to: ${value}`);
            this.selected_plan_uuid = value;
        }
    }

    @action clear_previous_sheet_selection() {
        this.previous_sheet_id = null;
        this.previous_sheet_tab_id = 0;
    }

    @action clear_all_sheet_state() {
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
    @observable preferences;

    constructor() {
        this.login_token_validated = false;
        this.signed_in_to_google = false;
    }

    @action setPreferences(value: Preferences) {
        this.preferences = value;
    }

    @action setLoginTokenValidated(flag: boolean) {
        this.login_token_validated = true;
    }

    @computed get signed_in(): boolean {
        if (!this.preferences) {
            return false;
        }
        let value = this.preferences.login_token && this.login_token_validated;
        // console.log(`signed in: ${value}, token: ${this._saved_state.login_token}, valid: ${this.login_token_validated}`);
        return value;
    }

    @computed get have_selection(): boolean {
        return this.selected_person != null;
    }

    @action clear_selection() {
        this.selected_person = null;
    }

    @action select(person: Person, date: Date, role: Role) {
        this.selected_person = person;
        this.selected_date = date;
        this.selected_role = role;
    }

    clear_sheet_state() {
        this.preferences.clear_all_sheet_state();
    }

    @action logout() {
        this.preferences.clearLogin();
        this.signed_in_to_google = false;
    }
}

export {
    UIStore,
    Preferences
}