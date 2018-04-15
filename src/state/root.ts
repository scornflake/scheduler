import {PeopleStore} from "./people";
import {RolesStore} from "./roles";
import {SavedState, UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {autorun, IReactionDisposer, toJS} from "mobx";
import {ScheduleInput} from "../scheduling/common";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {OrganizationStore} from "./organization";
import {action, observable} from "mobx-angular";
import {csd} from "../common/date-utils";

const SAVED_STATE_KEY = 'saved_state';

@Injectable()
class RootStore {
    @observable people_store: PeopleStore;
    @observable roles_store: RolesStore;
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    @observable schedule: ScheduleWithRules;
    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;

    constructor(private storage: Storage) {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.organization_store = new OrganizationStore();
        this.ui_store = new UIStore();

        NPBCStoreConstruction.SetupStore(this);
        // ThamesTest.SetupStore(this);

        this.storage.get(SAVED_STATE_KEY).then((state) => {
            if (state) {
                console.log("Restored saved state: " + JSON.stringify(state));
                this.ui_store.saved_state = state;
            } else {
                console.log("Setup state first time");
                this.ui_store.saved_state = {
                    google_sheet_id: "",
                    google_sheet_tab_id: 0,
                    google_sheet_id_retrieved: false
                };
            }
            this.setupSaving();
        });

    }

    @action
    generate_schedule(): ScheduleWithRules {
        // for testing, create some fake
        let params = new ScheduleInput(this.people_store, this.roles_store);
        params.start_date = csd(2018, 5, 3);
        params.end_date = csd(2018, 8, 5);

        if (!this.schedule) {
            this.schedule = new ScheduleWithRules(params);
            // this.schedule.add_note(new Date(2018, 0, 7), defaultSpeakerRole, "Mr Smith");
            // this.schedule.add_note(new Date(2018, 0, 7), defaultThemeRole, "Starting");
        }
        this.schedule.create_schedule();
        return this.schedule;
    }

    get state(): SavedState {
        return this.ui_store.saved_state;
    }

    private setupSaving() {
        this.saving = autorun(() => {
            this.storage.set(SAVED_STATE_KEY, toJS(this.ui_store.saved_state)).then(() => {
                console.log("Saved state: " + JSON.stringify(this.state));
            });
        });
        this.regenerator = autorun(() => {
            console.log("Generate schedule...");
            this.generate_schedule();
        });
    }
}

export {RootStore}