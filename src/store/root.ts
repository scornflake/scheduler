import {SavedState, UIStore} from "./UIState";
import {ApplicationRef, Injectable} from "@angular/core";
import {Organization, OrganizationStore} from "../scheduling/organization";
import {Logger, LoggingService} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {SafeJSON} from "../common/json/safe-stringify";
import {autorun, computed, IReactionDisposer, observable} from "mobx";
import {PeopleStore} from "../scheduling/people-store";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {Team} from "../scheduling/teams";
import {TeamsStore} from "../scheduling/teams-store";
import {csd} from "../scheduling/common/date-utils";
import {Person} from "../scheduling/people";

@Injectable()
class RootStore {
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    ready_event: Observable<boolean>;

    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;
    private logger: Logger;

    constructor(public db: SchedulerDatabase,
                private loggingService: LoggingService,
                private appRef: ApplicationRef) {

        this.logger = this.loggingService.getLogger("store");

        this.organization_store = new OrganizationStore(this.appRef);
        this.ui_store = new UIStore();

        this.initialize();
    }

    get draft_service(): Plan {
        return this.organization_store.draft_service;
    }


    initialize() {
        this.ready_event = Observable.create(obs => {
            // Wait for the DB to be ready, then load data
            this.db.ready_event.subscribe(r => {
                this.load().then(r => {
                    this.setup_fake_data();
                    this.setupSaving();
                    obs.next(true);
                });
            });
        }).pipe(share());

        this.ready_event.subscribe(r => {
            this.logger.info("RootStore done with init");
        })
    }

    async load() {
        try {
            let saved_state = await this.db.load_object_with_id('saved-state');
            this.logger.info(`Retrieved state: ${SafeJSON.stringify(saved_state)}`);
            this.ui_store.saved_state = saved_state as SavedState;
        } catch (e) {
            this.ui_store.saved_state = new SavedState('saved-state');
            this.logger.info("No stored saved state. Starting from fresh.");
        }

        await this.db.load_into_store<Person>(this.people_store, 'Person');
    }

    get teams_store():TeamsStore {
        return this.organization_store.teams_store;
    }

    get people_store(): PeopleStore {
        return this.organization_store.people_store;
    }

    @computed
    get state(): SavedState {
        return this.ui_store.saved_state;
    }

    private async setupSaving() {
        this.logger.info("Setting up state auto-saving...");
        this.saving = autorun(() => {
            // toJS creates a deep clone, thus accesses all of the properties of this.state
            // so: we SHOULD respond to state changes.
            this.db.store_or_update_object(this.state, true, true).then(() => {
                this.logger.info(`Saved state: ${SafeJSON.stringify(this.state)}`);
            }, rej => {
                this.logger.error(`Could not save state: ${rej}`);
            });
        });
        this.regenerator = autorun(() => {
            this.logger.info("Generate schedule...");
            this.organization_store.generate_schedule();
        });
    }

    private setup_fake_data() {
        let organization = new Organization("North Porirua Baptist Church");
        let org_store = this.organization_store;
        org_store.add_organisation(organization);

        // Peoples!
        // this.setup_fake_people();

        // make up a default team
        let team = new Team("Default", this.people_store.people);
        this.teams_store.add_team(team);

        // for testing, create some fake
        org_store.draft_service = org_store.plans_store.add_plan_named("Sunday Morning Service", team);
        org_store.draft_service.start_date = csd(2018, 6, 3);
        org_store.draft_service.end_date = csd(2018, 9, 30);

        NPBCStoreConstruction.SetupServiceRoles(org_store.draft_service);
        NPBCStoreConstruction.SetupService(org_store.draft_service, team);
        // ThamesTest.SetupStore(this);

    }

    private setup_fake_people() {
        NPBCStoreConstruction.SetupPeople(this.people_store);
    }
}

export {RootStore}