import {Person} from "../scheduling/people";
import {action, computed, observable} from "mobx";
import {Role} from "../scheduling/role";
import {Plan} from "../scheduling/plan";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";

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

    // Set by RootStore when a change to selectedPlan$ happens
    @observable private _selectedPlan: Plan;

    private logger: Logger;

    constructor() {
        this.login_token_validated = false;
        this.signed_in_to_google = false;
        this.logger = LoggingWrapper.getLogger('store.ui');
    }

    @action setLoginTokenValidated(flag: boolean) {
        this.login_token_validated = flag;
    }

    @computed get selectedPlan(): Plan {
        return this._selectedPlan;
    }

    @action setSelectedPlan(plan: Plan) {
        this.logger.debug(`Plan changed to: ${plan}`);
        this._selectedPlan = plan;
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
    UIStore
}