import {SavedState, UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {SafeJSON} from "../common/json/safe-stringify";
import {observable, toJS} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Person} from "../scheduling/people";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {Organization} from "../scheduling/organization";
import {IObjectCache} from "../providers/mapping/cache";
import {Role} from "../scheduling/role";
import {Assignment} from "../scheduling/assignment";
import {toStream} from "mobx-utils";
import {action} from "mobx-angular";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {trace} from "mobx";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache {
    @observable private _ui_store: UIStore;

    ready_event: Subject<boolean>;
    loggedInPerson: Person;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    private logger: Logger;

    private savedStateSubject: Subject<SavedState>;
    private scheduleSubject: Subject<ScheduleWithRules>;
    private selectedPlanSubject: Subject<Plan>;
    private uiStoreSubject: Subject<UIStore>;
    private loggedInPersonSubject: Subject<Person>;

    constructor(public db: SchedulerDatabase) {
        super();

        this.logger = LoggingWrapper.getLogger("service.store");
        this._ui_store = new UIStore();
        this.db.setCache(this);

        this.initialize();
    }

    @action
    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
    }

    initialize() {
        if (!this.ready_event) {
            this.ready_event = new BehaviorSubject(false);

            // Wait for the DB to be ready, then load data
            this.db.ready_event.subscribe(() => {
                this.load().then(() => {
                    this.logger.info("RootStore done with init");
                    this.ready_event.next(true);
                });
            });

        }
        return this.ready_event;
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
        this.logger.info(`Restoring saved state...`);

        // Now load the saved state, defaults, etc
        try {
            let saved_state = await this.db.async_load_object_with_id('saved-state');

            this.logger.debug(`Retrieved state: ${SafeJSON.stringify(saved_state)}`);

            this._ui_store.saved_state = saved_state as SavedState;
            if (!this._ui_store.saved_state) {
                this.logger.warn(`Oh oh, saved state wasn't restored. The returned object was a ${saved_state.constructor.name}... Maybe that's != SavedState?  Have reset it to a NEW SavedState instance.`);
                this._ui_store.saved_state = new SavedState('saved-state');
            }
        } catch (e) {
            this._ui_store.saved_state = new SavedState('saved-state');
            this.logger.debug(e);
            this.logger.info("No stored saved state. Starting from fresh.");

            await this.asyncSaveOrUpdateDb(this._ui_store.saved_state);
        }
    }

    async setupAfterUserLoggedIn() {
        this.logger.info(`Loading organizations...`);
        await this.db.async_load_into_store<Organization>(this.organizations, 'Organization', true);
        this.logger.info(`Loading people...`);
        await this.db.async_load_into_store<Person>(this.people, 'Person', true);
        this.logger.info(`Loading teams...`);
        await this.db.async_load_into_store<Team>(this.teams, 'Team', true);
        this.logger.info(`Loading plans...`);
        await this.db.async_load_into_store<Plan>(this.plans, 'Plan', true);

        // Sort out who the logged in user is (plus this.organization)
        this.setLoggedInPersonUsingSavedState();

        // We want that 'defaults' one to be alive so it triggers when we first load the state
        this.checkForDefaults();

        this.startReplication();

        this.logger.info(`App ready for: ${this.loggedInPerson}`);
    }

    private startReplication() {
        if (this.loggedInPerson) {
            if (this.loggedInPerson.organization) {
                if (this.loggedInPerson.organization.uuid) {
                    this.db.startReplication(`org_${this.loggedInPerson.organization.uuid}`);
                    this.logger.info("Started replication");
                } else {
                    this.logger.warn(`Cannot start replication: Logged in person doesn't have an organization UUID`);
                }
            } else {
                this.logger.warn(`Cannot start replication: Logged in person doesn't have an organization`);
            }
        } else {
            this.logger.warn(`Cannot start replication: No logged in person`);
        }
    }

    get state(): SavedState {
        return this._ui_store.saved_state;
    }

    get schedule$(): Observable<ScheduleWithRules> {
        if (!this.scheduleSubject) {
            this.scheduleSubject = new BehaviorSubject<ScheduleWithRules>(null);

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

    get ui_store$(): Subject<UIStore> {
        if (!this.uiStoreSubject) {
            this.uiStoreSubject = new BehaviorSubject<UIStore>(null);

            let stream = toStream(() => {
                // trace();
                this.logger.info(`UI Store changed to ${this._ui_store}. Signed in: ${this._ui_store.signed_in}`);
                this.uiStoreSubject.next(this._ui_store);
                toJS(this._ui_store);
                return this._ui_store;
            });

            stream.subscribe(this.uiStoreSubject);
        }
        return this.uiStoreSubject;
    }

    get loggedInPerson$(): Observable<Person> {
        if (!this.loggedInPersonSubject) {
            this.loggedInPersonSubject = new BehaviorSubject<Person>(null);
            this.saved_state$.map(state => {
                this.setLoggedInPersonUsingSavedState();
                return this.loggedInPerson;
            }).subscribe(this.loggedInPersonSubject);
        }
        return this.loggedInPersonSubject;
    }

    private setLoggedInPersonUsingSavedState() {
        let state = this.ui_store.saved_state;
        if (state.logged_in_person_uuid) {
            this.loggedInPerson = this.people.findOfThisTypeByUUID(state.logged_in_person_uuid);
            this.logger.info(`Logged in person = ${this.loggedInPerson}`);
        } else {
            this.logger.warn(`Logged in person is None`);
            this.loggedInPerson = null;
        }
    }

    get saved_state$(): Observable<SavedState> {
        if (!this.savedStateSubject) {
            this.savedStateSubject = new BehaviorSubject<SavedState>(null);

            // Observe changes, and send these to the subject
            toStream(() => {
                // accessAllTheProperties
                toJS(this._ui_store.saved_state);
                if (this._ui_store.saved_state) {
                    let plan_uuid = this._ui_store.saved_state.selected_plan_uuid;
                    this.logger.info(`Saved state changed... (plan UUID: ${plan_uuid})`);
                } else {
                    this.logger.info(`Saved state is None`);
                }
                // TODO: Figure out why this is needed and remove it
                this.savedStateSubject.next(this._ui_store.saved_state);
                return this._ui_store.saved_state;
            }).subscribe(this.savedStateSubject);
        }
        return this.savedStateSubject;
    }

    get selected_plan$(): Observable<Plan> {
        if (!this.selectedPlanSubject) {
            this.selectedPlanSubject = new BehaviorSubject<Plan>(null);

            // If the selected plan UUID changes, lookup the plan and broadcast the change
            toStream(() => {
                return this._ui_store.saved_state.selected_plan_uuid;
            }).subscribe(uuid => {
                let plan = this.plans.findOfThisTypeByUUID(uuid);
                if (plan) {
                    // this.logger.debug(`Plan changed to: ${uuid}`);
                    this.selectedPlanSubject.next(plan);
                } else {
                    this.logger.info(`selected_plan$ failure - can't find plan with ID: ${uuid}`);
                }
            });
        }
        return this.selectedPlanSubject;
    }

    async asyncSaveOrUpdateDb(object: ObjectWithUUID) {
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

    private checkForDefaults() {
        let state = this.ui_store.saved_state;
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
                this.logger.info(`Tried to select a default plan, but no plans in the DB for us to choose from :(`);
            }
        } else {
            this.logger.info(`Yeh, we do... the default plan is: ${this._ui_store.saved_state.selected_plan_uuid}`)
        }
    }

    @action
    logout() {
        this.ui_store.saved_state.logged_in_person_uuid = "";
        this.ui_store.saved_state.login_token = "";
        this.ui_store.saved_state.selected_plan_uuid = "";
        this.clear();
        this.db.async_store_or_update_object(this.ui_store.saved_state).then(() => {
            location.reload();
        });
    }
}

export {RootStore}