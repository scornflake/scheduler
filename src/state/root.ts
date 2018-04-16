import {PeopleStore} from "./people";
import {RolesStore} from "./roles";
import {SavedState, UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {autorun, IReactionDisposer, Lambda, observe, toJS} from "mobx";
import {ScheduleInput} from "../scheduling/common";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {OrganizationStore} from "./organization";
import {action, computed, observable} from "mobx-angular";
import {csd} from "../common/date-utils";
import {Logger, LoggingService} from "ionic-logging-service";

const SAVED_STATE_KEY = 'saved_state';

@Injectable()
class RootStore {
    @observable people_store: PeopleStore;
    @observable roles_store: RolesStore;
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;
    private logger: Logger;
    private hold_me: Lambda;

    constructor(private storage: Storage, private loggingService: LoggingService) {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.organization_store = new OrganizationStore();
        this.ui_store = new UIStore();
        this.logger = this.loggingService.getLogger("store");

        NPBCStoreConstruction.SetupStore(this.people_store, this.organization_store);
        // ThamesTest.SetupStore(this);

        this.storage.get(SAVED_STATE_KEY).then((state) => {
            if (state) {
                this.logger.info("Restored saved state: " + JSON.stringify(state));
                this.ui_store.saved_state = Object.assign(new SavedState(), state)
            } else {
                this.logger.info("Setup state first time");
                this.ui_store.saved_state = new SavedState();
            }
            this.setupSaving();
        });

    }

    @action
    generate_schedule(): ScheduleWithRules {
        // for testing, create some fake
        let params = new ScheduleInput(this.people_store, this.roles_store);
        params.start_date = csd(2018, 6, 3);
        params.end_date = csd(2018, 9, 30);

        this.schedule = new ScheduleWithRules(params, this.previous_schedule);
        this.schedule.create_schedule();
        return this.schedule;
    }

    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
        this.schedule = null;

        this.generate_schedule();
    }

    @computed
    get state(): SavedState {
        return this.ui_store.saved_state;
    }

    private setupSaving() {
        this.logger.info("Setting up state auto-saving...");
        this.saving = autorun(() => {
            // toJS creates a deep clone, thus accesses all of the properties of this.state
            // so: we SHOULD respond to state changes.
            this.storage.set(SAVED_STATE_KEY, toJS(this.state)).then(() => {
                this.logger.info("Saved state: " + JSON.stringify(this.state));
            });
        });
        this.regenerator = autorun(() => {
            this.logger.info("Generate schedule...");
            this.generate_schedule();
        });
    }
}

export {RootStore}