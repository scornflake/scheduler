import {SavedState, UIStore} from "./UIState";
import {Injectable, OnDestroy} from "@angular/core";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {IReactionDisposer, observable, reaction, toJS, trace} from "mobx";
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
import {Subscription} from "rxjs/Subscription";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache, OnDestroy {
    @observable ui_store: UIStore;

    loggedInPerson: Person;

    @observable schedule: ScheduleWithRules;
    @observable previousSchedule: ScheduleWithRules;

    private logger: Logger;

    private savedStateSubject: Subject<SavedState>;
    private scheduleSubject: Subject<ScheduleWithRules>;
    private selectedPlanSubject: Subject<Plan>;
    private uiStoreSubject: Subject<UIStore>;
    private loggedInPersonSubject: Subject<Person>;

    private spDisposer: IReactionDisposer;
    private ssDisposer: IReactionDisposer;
    private uiDisposer: IReactionDisposer;
    private lipDisposer: IReactionDisposer;
    private scheduleSubscription: Subscription;

    constructor(public db: SchedulerDatabase) {
        super();

        this.logger = LoggingWrapper.getLogger("service.store");
        this.setUIStore(new UIStore());
        this.db.setCache(this);

        this.loggedInPersonSubject = new BehaviorSubject<Person>(null);
        this.uiStoreSubject = new BehaviorSubject<UIStore>(null);
        this.scheduleSubject = new BehaviorSubject<ScheduleWithRules>(null);
        this.savedStateSubject = new BehaviorSubject<SavedState>(null);
        this.selectedPlanSubject = new BehaviorSubject<Plan>(null);

        this.setupSubjects();
    }

    ngOnDestroy() {
        this.ssDisposer();
        this.uiDisposer();
        this.lipDisposer();
    }

    @action setPreviousSchedule(schedule: ScheduleWithRules) {
        this.previousSchedule = schedule;
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
            let saved_state = await this.db.async_load_object_with_id('saved-state') as SavedState;

            this.logger.info(`Login Token: ${saved_state.login_token}`);
            this.logger.info(`Logged in person: ${saved_state.logged_in_person_uuid}`);

            this.ui_store.setSavedState(saved_state as SavedState);
            if (!this.ui_store.saved_state) {
                this.logger.warn(`Oh oh, saved state wasn't restored. The returned object was a ${saved_state.constructor.name}... Maybe that's != SavedState?  Have reset it to a NEW SavedState instance.`);
                this.ui_store.saved_state = new SavedState('saved-state');
            }
        } catch (e) {
            this.logger.debug(e);
            this.logger.info("No stored saved state. Starting from fresh.");

            this.ui_store.setSavedState(new SavedState('saved-state'));
            await this.asyncSaveOrUpdateDb(this.ui_store.saved_state);
        }
    }

    async setupAfterUserLoggedIn() {
        let before = this.organizations.length;
        let items = await this.db.async_load_into_store<Organization>(this.organizations, 'Organization');
        this.logger.info(`Loaded ${items.length} organizations... before: ${before}, after: ${this.organizations.length}`);

        items = await this.db.async_load_into_store<Person>(this.people, 'Person');
        this.logger.info(`Loaded ${items.length} people...`);

        items = await this.db.async_load_into_store<Team>(this.teams, 'Team');
        this.logger.info(`Loaded ${items.length} teams...`);

        items = await this.db.async_load_into_store<Plan>(this.plans, 'Plan');
        this.logger.info(`Loaded ${items.length} plans...`);

        // Sort out who the logged in user is (plus this.organization)
        // Need to kick this again, because lookup of the logged in person isn't possible until people are loaded.
        if (this.ui_store.saved_state.logged_in_person_uuid) {
            this.logger.info(`Letting the app know about the person thats logged in (${this.ui_store.saved_state.logged_in_person_uuid})`);
            this.lookupPersonAndTellSubscribers(this.ui_store.saved_state.logged_in_person_uuid);
        }

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
        return this.ui_store.saved_state;
    }

    private lookupPersonAndTellSubscribers(uuid: string) {
        if (uuid) {
            this.loggedInPerson = this.people.findOfThisTypeByUUID(uuid);
            this.logger.info(`Logged in person = ${this.loggedInPerson}`);
        } else {
            this.logger.warn(`Logged in person is None`);
            this.loggedInPerson = null;
        }
        if (this.loggedInPersonSubject) {
            this.loggedInPersonSubject.next(this.loggedInPerson);
        }
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
        if (team == null) {
            throw new Error('No team specified');
        }
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
                this.logger.info(`Plan set to ${this.ui_store.saved_state.selected_plan_uuid}, but I can't find that...`);
            }
            if (this.plans.plansByDateLatestFirst.length > 0) {
                this.logger.info(`Setting default selected plan to: ${this.plans.plansByDateLatestFirst[0].name}`);
                this.ui_store.saved_state.setSelectedPlanUUID(this.plans.plansByDateLatestFirst[0].uuid);
            } else {
                this.logger.info(`Tried to select a default plan, but no plans in the DB for us to choose from :(`);
            }
        } else {
            this.logger.info(`We do... the default plan is: ${this.ui_store.saved_state.selected_plan_uuid}`);

            // Seems we have to kick the value to make .next() fire on the plan again
            let temp = this.ui_store.saved_state.selected_plan_uuid;
            this.ui_store.saved_state.setSelectedPlanUUID(null);
            this.ui_store.saved_state.setSelectedPlanUUID(temp);
        }
    }

    @action logout() {
        this.ui_store.saved_state.clearLogin();
        this.clear();
        this.db.async_store_or_update_object(this.ui_store.saved_state).then(() => {
            location.reload();
        });
    }

    private setUIStore(uiStore: UIStore) {
        this.ui_store = uiStore;
    }

    private setupSubjects() {
        this._createLoggedInPersonReaction();
        this._createSavedStateReaction();
        this._createScheduleReaction();
        this._createSelectedPlanReaction();
        this._createUIStoreReaction();
    }

    private _createScheduleReaction() {
        if (!this.scheduleSubscription) {
            // Subscribe to a change in the plan, generate a new schedule, and then broadcast that
            this.scheduleSubscription = this.selected_plan$.map(plan => {
                if (plan) {
                    this.logger.info(`Regenerating schedule`);
                    let schedule = new ScheduleWithRules(plan, this.previousSchedule);
                    schedule.create_schedule();
                    // this.scheduleSubject.next(schedule);
                    return schedule;
                } else {
                    this.logger.warn(`No schedule generated, the provided plan was null`);
                }
                return null;
            }).subscribe(this.scheduleSubject);
        }
    }

    private _createSavedStateReaction() {
        if (!this.ssDisposer) {
            // Observe changes, and send these to the subject
            this.ssDisposer = reaction(() => {
                toJS(this.ui_store.saved_state);
                if (this.ui_store.saved_state) {
                    let plan_uuid = this.ui_store.saved_state.selected_plan_uuid;
                    this.logger.info(`Saved state changed... (plan UUID: ${plan_uuid})`);
                }
                return this.ui_store.saved_state;
            }, savedState => {
                // this.logger.info(`firing ${savedState} to the subjects observers`);
                this.savedStateSubject.next(savedState);
            }, {
                name: 'saved state',
                equals: (a, b) => false // so that we ALWAYS fire to the subject
            });

        }
    }

    private _createSelectedPlanReaction() {
        if (!this.spDisposer) {
            // If the selected plan UUID changes, lookup the plan and broadcast the change
            this.spDisposer = reaction(() => {
                if(this.ui_store.saved_state) {
                    return this.ui_store.saved_state.selected_plan_uuid;
                }
                return null;
            }, uuid => {
                let plan = this.plans.findOfThisTypeByUUID(uuid);
                if (plan) {
                    this.logger.warn(`Plan changed to: ${uuid}`);
                    this.selectedPlanSubject.next(plan);
                } else {
                    this.logger.warn(`selected_plan$ failure - can't find plan with ID: ${uuid}`);
                }
            }, {name: 'selected plan'});
        }
    }

    private _createUIStoreReaction() {
        if (!this.uiDisposer) {
            this.uiDisposer = reaction(() => {
                // trace();
                this.logger.info(`UI Store changed to ${this.ui_store}. Signed in: ${this.ui_store.signed_in}`);
                toJS(this.ui_store);
                return this.ui_store;
            }, () => {
                this.uiStoreSubject.next(this.ui_store);
            }, {name: 'ui store', equals: (a, b) => false});
        }
    }

    private _createLoggedInPersonReaction() {
        if (!this.lipDisposer) {
            this.lipDisposer = reaction(() => {
                trace();
                if (this.ui_store) {
                    if (this.ui_store.saved_state) {
                        let state = this.ui_store.saved_state;
                        if (state) {
                            return state.logged_in_person_uuid;
                        }
                    }
                }
                return null;
            }, (value) => {
                this.logger.debug("loggedInPerson$", `state change saw: ${value}`);
                this.lookupPersonAndTellSubscribers(value);
            }, {name: 'logged in person'});
            // above reaction uses default comparator, so that it only fires when the UUID CHANGES! yay.
        }
    }

    get schedule$(): Observable<ScheduleWithRules> {
        return this.scheduleSubject;
    }

    get ui_store$(): Subject<UIStore> {
        return this.uiStoreSubject;
    }

    get loggedInPerson$(): Observable<Person> {
        return this.loggedInPersonSubject;
    }

    get saved_state$(): Observable<SavedState> {
        return this.savedStateSubject;
    }

    get selected_plan$(): Observable<Plan> {
        return this.selectedPlanSubject;
    }
}

export {RootStore}