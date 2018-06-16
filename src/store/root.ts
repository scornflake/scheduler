import {SavedState, UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {share, take} from "rxjs/operators";
import {SafeJSON} from "../common/json/safe-stringify";
import {IReactionDisposer, observable, toJS} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Person} from "../scheduling/people";
import {PageUtils} from "../pages/page-utils";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {Organization} from "../scheduling/organization";
import {IObjectCache} from "../providers/mapping/cache";
import {Role} from "../scheduling/role";
import {Assignment} from "../scheduling/assignment";
import {toStream} from "mobx-utils";
import {action} from "mobx-angular";
import {Subject} from "rxjs/Subject";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache {
    @observable private _ui_store: UIStore;

    ready_event: Observable<boolean>;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    private saving: IReactionDisposer;
    private logger: Logger;
    private savedStateSubject: Subject<SavedState>;
    private scheduleSubject: Subject<ScheduleWithRules>;
    private selectedPlanSubject: Subject<Plan>;
    private uiStoreSubject: Subject<UIStore>;

    constructor(public db: SchedulerDatabase,
                public pageUtils: PageUtils,
    ) {
        super();

        this.logger = LoggingWrapper.getLogger("store");
        this._ui_store = new UIStore();

        this.initialize();
        this.db.setCache(this);
    }

    @action
    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
    }

    initialize() {
        this.ready_event = Observable.create(obs => {
            // Wait for the DB to be ready, then load data
            this.db.ready_event.subscribe(() => {
                this.load().then(() => {
                    obs.next(true);
                });
            });
        }).pipe(share());

        this.ready_event.subscribe(() => {
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

        // Now load the saved state, defaults, etc
        try {
            let saved_state = await this.db.async_load_object_with_id('saved-state');

            this.logger.info(`Retrieved state: ${SafeJSON.stringify(saved_state)}`);

            // Make sure subject's are alive. In particular the 'defaults' one takes the first change and makes some sanity checks.
            // We want that 'defaults' one to be alive so it triggers when we first load the state
            this.startCheckForDefaults();

            this._ui_store.saved_state = saved_state as SavedState;
            if (!this._ui_store.saved_state) {
                this.logger.warn(`Oh oh, saved state wasn't restored. The returned object was a ${saved_state.constructor.name}... Maybe that's != SavedState?  Have reset it to a NEW SavedState instance.`);
                this._ui_store.saved_state = new SavedState('saved-state');
            }
        } catch (e) {
            // Make sure subject's are alive. In particular the 'defaults' one takes the first change and makes some sanity checks.
            // We want that 'defaults' one to be alive so it triggers when we first load the state
            this.startCheckForDefaults();

            this._ui_store.saved_state = new SavedState('saved-state');
            this.logger.error(e);
            this.logger.info("No stored saved state. Starting from fresh.");
            await this.async_save_or_update_to_db(this._ui_store.saved_state);
        }

    }

    get state(): SavedState {
        return this._ui_store.saved_state;
    }

    get schedule$(): Observable<ScheduleWithRules> {
        if (!this.scheduleSubject) {
            this.scheduleSubject = new Subject<ScheduleWithRules>();

            // Subscribe to a change in the plan, generate a new schedule, and then broadcast that
            this.selected_plan$.map(plan => {
                if (plan) {
                    this.logger.info(`Regenerating schedule`);
                    let schedule = new ScheduleWithRules(plan, this.previous_schedule);
                    schedule.create_schedule();
                    return schedule;
                } else {
                    this.logger.info(`No schedule generated, the provided plan was null`);
                }
            }, true).subscribe(this.scheduleSubject);
        }
        return this.scheduleSubject;
    }

    get ui_store(): UIStore {
        return this._ui_store;
    }

    get ui_store$(): Observable<UIStore> {
        if (!this.uiStoreSubject) {
            this.uiStoreSubject = new Subject<UIStore>();

            toStream(() => {
                console.log(`UI Store changed`);
                toJS(this._ui_store);
                return this._ui_store;
            }).subscribe(this.uiStoreSubject);
        }
        return this.uiStoreSubject;
    }

    get saved_state$(): Observable<SavedState> {
        if (!this.savedStateSubject) {
            this.savedStateSubject = new Subject<SavedState>();

            // Observe changes, and send these to the subject
            toStream(() => {
                // accessAllTheProperties
                toJS(this._ui_store.saved_state);
                let foo = this._ui_store.saved_state.selected_plan_uuid;
                this.logger.info(`Saved state changed... (plan: ${foo})`);
                return this._ui_store.saved_state;
            }).subscribe(this.savedStateSubject);
        }
        return this.savedStateSubject;
    }

    get selected_plan$(): Observable<Plan> {
        if (!this.selectedPlanSubject) {
            this.selectedPlanSubject = new Subject<Plan>();

            // If the selected plan UUID changes, lookup the plan and broadcast the change
            toStream(() => {
                return this._ui_store.saved_state.selected_plan_uuid;
            }).subscribe(uuid => {
                let plan = this.plans.findOfThisTypeByUUID(uuid);
                if (plan) {
                    this.logger.debug(`Plan changed to: ${uuid}`);
                    this.selectedPlanSubject.next(plan);
                } else {
                    this.logger.info(`selected_plan$ failure - can't find plan with ID: ${uuid}`);
                }
            });
        }
        return this.selectedPlanSubject;
    }

    private setup_fake_draft_plan() {
        return;

        // make up a default team
        // let team = this.teams.firstThisTypeByName("Default");
        // if (team) {
        //     // for testing, create some fake
        //     if (!this.draft_service) {
        //         this.draft_service = this.plans.add(new Plan("Sunday Morning Service", team));
        //         this.draft_service.start_date = csd(2018, 6, 3);
        //         this.draft_service.end_date = csd(2018, 9, 30);
        //
        //         NPBCStoreConstruction.AttachRolesToPlan(this.draft_service);
        //
        //         try {
        //             NPBCStoreConstruction.AddPeopleToPlanWithRoles(this.draft_service, team);
        //         } catch (e) {
        //             // oh oh.
        //             let ve = ObjectValidation.simple("Cannot setup default fake plan. Is the DB OK? " + e.toString().substr(0, 100));
        //             this.pageUtils.show_validation_error(ve, true);
        //         }
        //     }
        // } else {
        //     this.pageUtils.show_validation_error(ObjectValidation.simple("Cant do schedule cos no team!"));
        // }
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
        plan.team.people.forEach(p => {
            plan.assignment_for(p);
        });
        return plan;
    }

    async asyncDuplicateExistingPlan(planName: string, existingPlan: Plan): Promise<Plan> {
        if (!existingPlan) {
            throw new Error(`No existing plan specified`)
        }
        if (!existingPlan.team) {
            throw new Error(`Existing plan (to copy) has no team defined`)
        }
        let newPlan = new Plan(planName, existingPlan.team);
        newPlan.days_per_period = existingPlan.days_per_period;

        // use same set of roles
        existingPlan.roles.forEach(r => {
            newPlan.add_role(r);
        });

        // this is a bit meh. I want to take a deep copy of the assignments, but do this via JSON because of circular refs.
        // I "can" however MUNCH this by using the converter!
        // Not ... NICE, but doable?
        let newAssignments = [];
        for (let assign of existingPlan.assignments) {
            let assign_dict = await this.db.converter.async_create_dict_from_js_object(assign);

            // redo the _id, remove the _rev and make is_new = true.
            // This'll make the object appear 'new'
            assign_dict._id = ObjectWithUUID.guid();
            assign_dict._rev = null;
            assign_dict.is_new = true;

            // Now convert it back to an assignment, and VIOLA.
            let newAssignment = await this.db.converter.async_create_js_object_from_dict(assign_dict, 'Assignment');
            if (newAssignment) {
                newAssignments.push(newAssignment);
            } else {
                throw new Error(`Couldn't duplicate assignment, got back nothing for async_create_js_object_from_dict`);
            }
        }

        // evil evil evil
        newPlan.assignments = newAssignments;
        return newPlan;
    }

    private startCheckForDefaults() {
        this.saved_state$.pipe(take(1)).subscribe(state => {
            this.logger.info(`Checking to see if we have a default selected plan...`);
            let planSet = state.selected_plan_uuid != null;
            let planDoesntExist = planSet && this.plans.findOfThisTypeByUUID(state.selected_plan_uuid) == null;
            if (!planSet || planDoesntExist) {
                if (!planSet) {
                    this.logger.info(`No plan set`);
                }
                if (planDoesntExist) {
                    this.logger.info(`Plan set to ${this._ui_store.saved_state.selected_plan_uuid}, but I can't find that...`);
                }
                if (this.plans.plansByDateLatestFirst.length > 0) {
                    this.logger.info(`Setting default selected plan to: ${this.plans.plansByDateLatestFirst[0].name}`);
                    this._ui_store.saved_state.selected_plan_uuid = this.plans.plansByDateLatestFirst[0].uuid;
                } else {
                    this.logger.info(`Tried to setup a new default plan, but no plans in the DB for us to choose from :(`);
                }
            } else {
                this.logger.info(`Yeh, we do... the default plan is: ${this._ui_store.saved_state.selected_plan_uuid}`)
            }
        });

        this._ui_store.saved_state = this._ui_store.saved_state;
    }
}

export {RootStore}