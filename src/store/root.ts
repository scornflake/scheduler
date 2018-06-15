import {SavedState, UIStore} from "./UIState";
import {ApplicationRef, Injectable} from "@angular/core";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share} from "rxjs/operators";
import {SafeJSON} from "../common/json/safe-stringify";
import {autorun, IReactionDisposer, observable} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Person} from "../scheduling/people";
import {PageUtils} from "../pages/page-utils";
import {ObjectValidation} from "../scheduling/shared";
import {csd} from "../scheduling/common/date-utils";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {Organization} from "../scheduling/organization";
import {NPBCStoreConstruction} from "../tests/test.store";
import {IObjectCache} from "../providers/mapping/cache";
import {Role} from "../scheduling/role";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache {
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
        this.db.setCache(this);
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

    async singleOrgStoredInDB(): Promise<Organization> {
        let orgs = await this.db.async_load_all_objects_of_type('Organization');
        if (orgs) {
            // we want only one. If there's more, I think we should barf
            if (orgs.length > 1) {
                throw new Error(`${orgs.length} organizations. Oh no! I expected only one!`);
            } else if (orgs.length == 1) {
                return orgs[0];
            }
        }
        return null;
    }

    async load() {
        try {
            let saved_state = await this.db.async_load_object_with_id('saved-state');
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

        this.logger.info(`Loading base data...`);

        /*
        Can only load stuff when we have our organization (everything depends on that, since it names our shared DB, thus connection to the outside)
         */

        // In our DB, we expect only ONE organization
        try {
            this.organization = await this.singleOrgStoredInDB();
        } catch (e) {
            this.pageUtils.show_message(`During load(): ${e}`);
        }

        await this.db.async_load_into_store<Person>(this.people, 'Person');
        await this.db.async_load_into_store<Team>(this.teams, 'Team');
        await this.db.async_load_into_store<Plan>(this.plans, 'Plan');
    }

    get state(): SavedState {
        return this.ui_store.saved_state;
    }

    private async setupSaving() {
        this.logger.info("Setting up state auto-saving...");
        this.saving = autorun(() => {
            // toJS creates a deep clone, thus accesses all of the properties of this.state
            // so: we SHOULD respond to state changes.
            this.db.async_store_or_update_object(this.state, true, true).then(() => {
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

    private setup_fake_draft_plan() {
        return;

        // make up a default team
        let team = this.teams.firstThisTypeByName("Default");
        if (team) {
            // for testing, create some fake
            if (!this.draft_service) {
                this.draft_service = this.plans.add(new Plan("Sunday Morning Service", team));
                this.draft_service.start_date = csd(2018, 6, 3);
                this.draft_service.end_date = csd(2018, 9, 30);

                NPBCStoreConstruction.AttachRolesToPlan(this.draft_service);

                try {
                    NPBCStoreConstruction.AddPeopleToPlanWithRoles(this.draft_service, team);
                } catch (e) {
                    // oh oh.
                    let ve = ObjectValidation.simple("Cannot setup default fake plan. Is the DB OK? " + e.toString().substr(0, 100));
                    this.pageUtils.show_validation_error(ve, true);
                }
            }
        } else {
            this.pageUtils.show_validation_error(ObjectValidation.simple("Cant do schedule cos no team!"));
        }
    }

    private setup_fake_data() {
        this.setup_fake_draft_plan();
    }

    async async_save_or_update_to_db(object: ObjectWithUUID) {
        return await this.db.async_store_or_update_object(object);
    }

    async async_remove_object_from_db(object: ObjectWithUUID) {
        this.logger.info(`Deleting object of type ${object.type}, id: ${object.uuid}`);
        return await this.db.async_delete_object(object);
    }

    getFromCache(uuid: string): ObjectWithUUID {
        return this.findByUUID(uuid);
    }

    saveInCache(object: ObjectWithUUID): void {
        this.add_object_to_array(object, true);
    }

    evict(object: ObjectWithUUID): void {
        this.remove_object_from_array(object);
    }

    removeAndWait(obj: ObjectWithUUID) {
        this.async_remove_object_from_db(obj).then(() => {
            console.log(`Removed '${obj.uuid}/${obj.type}' from DB`);
        });
    }

    removeTeamFromStoreWithRefcheck(team: Team): void {
        super.removeTeamFromStoreWithRefcheck(team);
        this.removeAndWait(team);
    }

    removePlanFromStoreWithRefcheck(plan: Plan): void {
        super.removePlanFromStoreWithRefcheck(plan);
        this.removeAndWait(plan);
    }

    removeRoleFromStoreWithRefcheck(role: Role): void {
        super.removeRoleFromStoreWithRefcheck(role);
        this.removeAndWait(role);
    }

    removePersonFromStoreWithRefcheck(person: Person): void {
        super.removePersonFromStoreWithRefcheck(person);
        this.removeAndWait(person);
    }

    createNewPlan(planName: string, team: Team) {
        let plan = new Plan(planName, team);
        this.roles.forEach(r => {
            plan.add_role(r);
        });
        return plan;
    }
}

export {RootStore}