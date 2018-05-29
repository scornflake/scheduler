import {PeopleStore} from "../scheduling/people";
import {RolesStore} from "../scheduling/tests/role-store";
import {SavedState, UIStore} from "./UIState";
import {ApplicationRef, Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {ScheduleInput} from "../scheduling/shared";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {OrganizationStore} from "../scheduling/organization";
import {csd} from "../scheduling/common/date-utils";
import {Logger, LoggingService} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {SafeJSON} from "../common/json/safe-stringify";
import {action, autorun, computed, IReactionDisposer, observable, toJS} from "mobx";

const SAVED_STATE_KEY = 'saved_state';

@Injectable()
class RootStore {
    @observable people_store: PeopleStore;
    @observable roles_store: RolesStore;
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    ready_event: Observable<boolean>;

    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;
    private logger: Logger;

    constructor(private storage: Storage,
                private loggingService: LoggingService,
                private appRef: ApplicationRef) {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.organization_store = new OrganizationStore();
        this.ui_store = new UIStore();
        this.logger = this.loggingService.getLogger("store");

        NPBCStoreConstruction.SetupStore(this.people_store, this.organization_store);
        // ThamesTest.SetupStore(this);

        this.load();
    }

    private load() {
        this.ready_event = Observable.create(obs => {
            this.storage.get(SAVED_STATE_KEY).then((state) => {
                if (state) {
                    this.logger.info("Restored saved state: " + SafeJSON.stringify(state));
                    this.ui_store.saved_state = Object.assign(new SavedState(), state)
                } else {
                    this.logger.info("Setup state first time");
                    this.ui_store.saved_state = new SavedState();
                }
                this.setupSaving();
                obs.next(true);
                // obs.complete();
            });
        });
        this.ready_event.subscribe(v => {
            this.logger.info("Root object 'ready' fired. App is ready to go!")
        }, null, () => {
            this.logger.info("Ready event complete")
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

        this.appRef.tick();
        return this.schedule;
    }

    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
        this.schedule = null;

        // this.generate_schedule();
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
                this.logger.info("Saved state: " + SafeJSON.stringify(this.state));
            });
        });
        this.regenerator = autorun(() => {
            this.logger.info("Generate schedule...");
            this.generate_schedule();
        });
    }
}

export {RootStore}