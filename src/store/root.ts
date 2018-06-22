import {UIStore} from "./UIState";
import {Injectable, OnDestroy} from "@angular/core";
import {Logger} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {IReactionDisposer, observable, reaction, toJS, trace} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/base-types";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Person, Preferences} from "../scheduling/people";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {Organization} from "../scheduling/organization";
import {IObjectCache} from "../providers/mapping/cache";
import {Role} from "../scheduling/role";
import {Assignment} from "../scheduling/assignment";
import {action} from "mobx-angular";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Subscription} from "rxjs/Subscription";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache, OnDestroy {
    @observable ui_store: UIStore;

    @observable schedule: ScheduleWithRules;
    @observable previousSchedule: ScheduleWithRules;

    private logger: Logger;

    private preferencesSubject: Subject<Preferences>;
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
        this.preferencesSubject = new BehaviorSubject<Preferences>(null);
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

    // Simple shortcut to the UIStore
    get loggedInPerson(): Person {
        if (this.ui_store) {
            return this.ui_store.loggedInPerson;
        }
        return null;
    }

    async load() {
        // this.logger.info(`Restoring preferences...`);
        //
        // try {
        //     let saved_state = await this.db.async_load_object_with_id('saved-state') as Preferences;
        //
        //     this.logger.info(`Login Token: ${saved_state.login_token}`);
        //     this.logger.info(`Logged in person: ${saved_state.logged_in_person_uuid}`);
        //
        //     this.ui_store.setPreferences(saved_state as Preferences);
        //     if (!this.ui_store.preferences) {
        //         this.logger.warn(`Oh oh, prefs wasn't restored. The returned object was a ${saved_state.constructor.name}... Maybe that's != Preferences?  Have reset it to a NEW SavedState instance.`);
        //         this.ui_store.preferences = new Preferences('saved-state');
        //     }
        // } catch (e) {
        //     this.logger.debug(e);
        //     this.logger.info("No prefs. Starting from fresh.");
        //
        //     this.ui_store.setPreferences(new Preferences('saved-state'));
        //     await this.asyncSaveOrUpdateDb(this.ui_store.preferences);
        // }
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

        // We want that 'defaults' one to be alive so it triggers when we first load the state
        this.checkForDefaults();

        this.startReplication();

        this.logger.info(`App ready for: ${this.loggedInPerson}`);
    }

    private startReplication() {
        if (this.loggedInPerson) {
            let organization = this.loggedInPerson.organization;
            if (organization) {
                if (organization.uuid) {
                    this.db.startReplication(`org_${organization.uuid}`);
                    this.logger.info(`Started replication for ${organization.name}`);
                } else {
                    this.logger.warn(`Cannot start replication: Logged in persons '${this.loggedInPerson}' organization doesn't have a UUID`);
                }
            } else {
                this.logger.warn(`Cannot start replication: Logged in person '${this.loggedInPerson}' doesn't have an organization`);
            }
        } else {
            this.logger.warn(`Cannot start replication: No logged in person`);
        }
    }

    async asyncSaveOrUpdateDb(object: ObjectWithUUID) {
        return await this.db.async_store_or_update_object(object);
    }

    async async_remove_object_from_db(object: ObjectWithUUID) {
        this.logger.info(`Deleting object of type ${object.type}, id: ${object.uuid}`);
        return await this.db.asyncDeleteObject(object);
    }

    getFromCache(uuid: string): ObjectWithUUID {
        return this.findByUUID(uuid);
    }

    saveInCache(object: ObjectWithUUID): void {
        this.addObjectToStore(object, true);
    }

    evict(object: ObjectWithUUID): void {
        this.removeObjectFromStore(object);
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
            plan.addRole(r);
        });
        plan.team.people.forEach(p => {
            plan.assignmentFor(p);
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
            newPlan.addRole(r);
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
        let person = this.ui_store.loggedInPerson;
        if (!person) {
            throw new Error('Unable to start defaults check, no person logged in');
        }
        let prefs = person.preferences;
        if (!prefs) {
            throw new Error('Unable to start defaults check, no preferences');
        }
        this.logger.info(`Checking to see if we have a default selected plan...`);
        let isPlanSet = prefs.selected_plan_uuid != null;
        let planDoesntExist = isPlanSet && this.plans.findOfThisTypeByUUID(prefs.selected_plan_uuid) == null;
        if (!isPlanSet || planDoesntExist) {
            if (!isPlanSet) {
                this.logger.info(`No plan set`);
            }
            if (planDoesntExist) {
                this.logger.info(`Plan set to ${person.preferences.selected_plan_uuid}, but I can't find that...`);
            }
            if (this.plans.plansByDateLatestFirst.length > 0) {
                this.logger.info(`Setting default selected plan to: ${this.plans.plansByDateLatestFirst[0].name}`);
                person.preferences.setSelectedPlan(this.plans.plansByDateLatestFirst[0]);
            } else {
                this.logger.info(`Tried to select a default plan, but no plans in the DB for us to choose from :(`);
            }
        } else {
            this.logger.info(`We do... the default plan is: ${person.preferences.selected_plan_uuid}`);

            // Seems we have to kick the value to make .next() fire on the plan again
            // let temp = this.ui_store.preferences.selected_plan_uuid;
            // this.ui_store.preferences.setSelectedPlanUUID(null);
            // this.ui_store.preferences.setSelectedPlanUUID(temp);
        }
    }

    private setUIStore(uiStore: UIStore) {
        this.ui_store = uiStore;
    }

    private setupSubjects() {
        this._createLoggedInPersonReaction();
        this._createPreferencesReaction();
        this._createScheduleReaction();
        this._createSelectedPlanReaction();
        this._createUIStoreReaction();
    }

    private _createScheduleReaction() {
        if (!this.scheduleSubscription) {
            // Subscribe to a change in the plan, generate a new schedule, and then broadcast that
            this.scheduleSubscription = this.selectedPlan$.map(plan => {
                if (plan) {
                    this.logger.info(`Regenerating schedule`);
                    let schedule = new ScheduleWithRules(plan, this.previousSchedule);
                    schedule.create_schedule();
                    // this.scheduleSubject.next(schedule);
                    return schedule;
                } else {
                    this.logger.info(`No schedule generated, the provided plan was null`);
                }
                return null;
            }).subscribe(this.scheduleSubject);
        }
    }

    private _createPreferencesReaction() {
        if (!this.ssDisposer) {
            // Observe changes, and send these to the subject
            this.ssDisposer = reaction(() => {
                if (this.loggedInPerson) {
                    let prefs = this.loggedInPerson.preferences;
                    toJS(prefs);
                    if (prefs) {
                        let plan_uuid = prefs.selected_plan_uuid;
                        this.logger.info(`Preferences changed... (plan UUID: ${plan_uuid})`);
                    }
                    return prefs;
                }
                return null;
            }, prefs => {
                this.preferencesSubject.next(prefs);
            }, {
                name: 'preferences',
                equals: (a, b) => false // so that we ALWAYS fire to the subject
            });

        }
    }

    private _createSelectedPlanReaction() {
        if (!this.spDisposer) {
            // If the selected plan UUID changes, lookup the plan and broadcast the change
            this.spDisposer = reaction(() => {
                if (this.loggedInPerson) {
                    if (this.loggedInPerson.preferences) {
                        return this.loggedInPerson.preferences.selected_plan_uuid;
                    }
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
                if (this.ui_store) {
                    this.logger.info(`UI Store changed, person:${this.ui_store.loggedInPerson ? this.ui_store.loggedInPerson.name : '<no one>'}, selection: ${this.ui_store.have_selection || '<no selection>'}...`);
                    toJS(this.ui_store);
                }
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
                    return this.ui_store.loggedInPerson;
                }
                return null;
            }, (person) => {
                this.logger.debug("loggedInPerson$", `state change saw: ${person}`);
                this.loggedInPersonSubject.next(person);
            }, {name: 'logged in person'});
            // above reaction uses default comparator, so that it only fires when the UUID CHANGES! yay.
        }
    }

    get schedule$(): Observable<ScheduleWithRules> {
        return this.scheduleSubject;
    }

    get uiStore$(): Subject<UIStore> {
        return this.uiStoreSubject;
    }

    get loggedInPerson$(): Observable<Person> {
        return this.loggedInPersonSubject;
    }

    get preferences$(): Observable<Preferences> {
        return this.preferencesSubject;
    }

    get selectedPlan$(): Observable<Plan> {
        return this.selectedPlanSubject;
    }
}

export {RootStore}