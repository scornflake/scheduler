import {SavedState, UIStore} from "./UIState";
import {ApplicationRef, Injectable} from "@angular/core";
import {Organization} from "../scheduling/organization";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {SafeJSON} from "../common/json/safe-stringify";
import {autorun, IReactionDisposer, observable} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/common/base_model";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Person} from "../scheduling/people";
import {PageUtils} from "../pages/page-utils";
import {ObjectValidation} from "../scheduling/shared";
import {csd} from "../scheduling/common/date-utils";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";

@Injectable()
class RootStore extends SchedulerObjectStore {
    @observable ui_store: UIStore;

    ready_event: Observable<boolean>;

    @observable draft_service: Plan;
    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    private regenerator: IReactionDisposer;
    private saving: IReactionDisposer;
    private logger: Logger;

    constructor(public db: SchedulerDatabase,
                public pageUtils: PageUtils,
                private appRef: ApplicationRef) {
        super();

        this.logger = LoggingWrapper.getLogger("store");
        this.ui_store = new UIStore();

        this.initialize();
    }

    generate_schedule(): ScheduleWithRules {
        this.schedule = new ScheduleWithRules(this.draft_service, this.previous_schedule);
        this.schedule.create_schedule();
        this.appRef.tick();
        return this.schedule;
    }

    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
        this.schedule = null;
        // this.generate_schedule();
    }

    initialize() {
        this.ready_event = Observable.create(obs => {
            // Wait for the DB to be ready, then load data
            this.db.ready_event.subscribe(() => {
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
            if (!this.ui_store.saved_state) {
                this.logger.warn(`Oh oh, saved state wasn't restored. The returned object was a ${saved_state.constructor.name}... Maybe that's != SavedState?  Have reset it to a NEW SavedState instance.`);
                this.ui_store.saved_state = new SavedState('saved-state');
            }
        } catch (e) {
            this.ui_store.saved_state = new SavedState('saved-state');
            this.logger.info("No stored saved state. Starting from fresh.");
        }


        /*
        Can only load stuff when we have our organization (everything depends on that, since it names our shared DB, thus connection to the outside)
         */

        await this.db.load_into_store<Person>(this.people, 'Person');
        await this.db.load_into_store<Team>(this.teams, 'Team');
    }

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
            // this.organization_store.generate_schedule();
        });
    }

    private setup_fake_data() {
        // make up a default team
        let team = this.teams.firstThisTypeByName("Default");
        if (team) {
            // for testing, create some fake
            this.draft_service = this.plans.add(new Plan("Sunday Morning Service", team));
            this.draft_service.start_date = csd(2018, 6, 3);
            this.draft_service.end_date = csd(2018, 9, 30);

            NPBCStoreConstruction.SetupServiceRoles(this.draft_service);

            try {
                // NPBCStoreConstruction.SetupService(org_store.draft_service, team);
            } catch (e) {
                // oh oh.
                let ve = ObjectValidation.simple("Cannot setup store. Is the DB OK? " + e.toString().substr(0, 100));
                this.pageUtils.show_validation_error(ve, true);
            }
        } else {
            this.pageUtils.show_validation_error(ObjectValidation.simple("Cant do schedule cos no team"));
        }
        // ThamesTest.SetupStore(this);

    }

    private setup_fake_people() {
        NPBCStoreConstruction.SetupPeople(this.people);
    }

    save_or_update(object: ObjectWithUUID) {
        this.db.store_or_update_object(object);
    }

    remove_object(object: ObjectWithUUID) {
        this.logger.info(`Deleting object of type ${object.type}, id: ${object.uuid}`);
        return this.db.delete_object(object);
    }
}

export {RootStore}