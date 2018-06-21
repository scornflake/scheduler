import {Person} from "../scheduling/people";
import {action, computed, observable} from "mobx";
import {Role} from "../scheduling/role";

class UIStore {
    /*
    Transient state
     */
    @observable selected_person: Person;
    @observable selected_date: Date;
    @observable selected_role: Role;

    @observable signed_in_to_google: boolean;
    @observable login_token_validated: boolean;

    // Set by SchedulerServer as part of startuplifecycle
    @observable private _loggedInPerson: Person;

    constructor() {
        this.login_token_validated = false;
        this.signed_in_to_google = false;
    }

    @action setLoginTokenValidated(flag: boolean) {
        this.login_token_validated = flag;
    }

    @computed get loggedInPerson(): Person {
        return this._loggedInPerson;
    }

    @action setLoggedInPerson(person: Person) {
        this._loggedInPerson = person;
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
    }
}

export {
    UIStore}