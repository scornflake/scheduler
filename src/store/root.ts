import {SavedState, UIStore} from "./UIState";
import {ApplicationRef, Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {OrganizationStore} from "../scheduling/organization";
import {Logger, LoggingService} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {SafeJSON} from "../common/json/safe-stringify";
import {autorun, computed, IReactionDisposer, observable, toJS} from "mobx";
import {PeopleStore} from "../scheduling/people";
import {RolesStore} from "../scheduling/tests/role-store";

const SAVED_STATE_KEY = 'saved_state';

@Injectable()
class RootStore {
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    ready_event: Observable<boolean>;

    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;
    private logger: Logger;

    constructor(private storage: Storage,
                private loggingService: LoggingService,
                private appRef: ApplicationRef) {

        this.logger = this.loggingService.getLogger("store");

        this.organization_store = new OrganizationStore(this.appRef);
        this.ui_store = new UIStore();

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

    get people_store(): PeopleStore {
        return this.organization_store.people_store;
    }

    get roles_store(): RolesStore {
        return this.organization_store.roles_store;
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
            this.organization_store.generate_schedule();
        });
    }
}

export {RootStore}