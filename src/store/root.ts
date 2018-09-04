import {UIStore} from "./UIState";
import {Injectable, NgZone, OnDestroy, OnInit} from "@angular/core";
import {Logger, LoggingService} from "ionic-logging-service";
import {Observable} from "rxjs/Observable";
import {IReactionDisposer, observable, reaction, runInAction, toJS, trace} from "mobx";
import {Plan} from "../scheduling/plan";
import {SchedulerDatabase} from "../providers/server/db";
import {Team} from "../scheduling/teams";
import {ObjectWithUUID} from "../scheduling/base-types";
import {Person, Preferences} from "../scheduling/people";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {Organization} from "../scheduling/organization";
import {IObjectCache} from "../providers/mapping/cache";
import {Role} from "../scheduling/role";
import {action} from "mobx-angular";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";

@Injectable()
class RootStore extends SchedulerObjectStore implements IObjectCache, OnInit, OnDestroy {
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
    private scheduleDisposer: IReactionDisposer;

    private db: SchedulerDatabase;

    constructor(private zone: NgZone, private logService: LoggingService) {
        super();

        this.logger = this.logService.getLogger("service.store");
        this.setUIStore(new UIStore(logService));

        this.loggedInPersonSubject = new BehaviorSubject<Person>(null);
        this.uiStoreSubject = new BehaviorSubject<UIStore>(null);
        this.scheduleSubject = new BehaviorSubject<ScheduleWithRules>(null);
        this.preferencesSubject = new BehaviorSubject<Preferences>(null);
        this.selectedPlanSubject = new BehaviorSubject<Plan>(null);
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        this.cleanupReactionDisposers();
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

    async loadDataFromStorage() {
        let before = this.organizations.length;
        let items = await this.db.async_load_into_store<Organization>(this.organizations, 'Organization');
        this.logger.info(`Loaded ${items.length} organizations... before: ${before}, after: ${this.organizations.length}`);

        items = await this.db.async_load_into_store<Role>(this.roles, 'Role');
        this.logger.info(`Loaded ${items.length} roles...`);

        items = await this.db.async_load_into_store<Person>(this.people, 'Person');
        this.logger.info(`Loaded ${items.length} people...`);

        items = await this.db.async_load_into_store<Team>(this.teams, 'Team');
        this.logger.info(`Loaded ${items.length} teams...`);

        items = await this.db.async_load_into_store<Plan>(this.plans, 'Plan');
        this.logger.info(`Loaded ${items.length} plans...`);

        this.logger.info(`DB loaded into memory`);
    }

    async asyncSaveOrUpdateDb(object: ObjectWithUUID): Promise<ObjectWithUUID> {
        return await this.db.async_storeOrUpdateObject(object);
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

    evict(object: ObjectWithUUID | string): void {
        if (object instanceof ObjectWithUUID) {
            this.removeObjectFromStore(object);
        } else {
            // find it by ID first
            let existing = this.getFromCache(object);
            if (existing) {
                this.removeObjectFromStore(existing);
            }
        }
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
            this.logger.warn(`Copying assignment: ${assign}...`);
            let assign_dict = await this.db.converter.writer.async_createDocFromJSObject(assign);

            // Provide a new object _id, remove the _rev and make is_new = true.
            // This'll make the Assignment appear 'new'
            assign_dict._id = ObjectWithUUID.guid();
            assign_dict._rev = null;
            assign_dict.is_new = true;

            // Now convert it back to an assignment, and VIOLA.
            let newAssignment = await this.db.converter.reader.async_createJSObjectFromDoc(assign_dict, 'Assignment') as ObjectWithUUID;
            if (newAssignment) {
                // The async_createJSObjectFromDoc sets is_new to be false. We need it to be true, as it's a copy.
                newAssignment.setIsNew(true);
                newAssignments.push(newAssignment);
            } else {
                throw new Error(`Couldn't duplicate assignment, got back nothing for async_create_js_object_from_dict`);
            }
        }

        // evil evil evil
        newPlan.assignments = newAssignments;
        await this.db.async_storeOrUpdateObject(newPlan);
        return newPlan;
    }

    private setUIStore(uiStore: UIStore) {
        this.ui_store = uiStore;
    }

    private setupReactions() {
        this._createLoggedInPersonReaction();
        this._createPreferencesReaction();
        this._createScheduleReaction();
        this._createSelectedPlanReaction();
        this._createUIStoreReaction();
    }

    private _createScheduleReaction() {
        if (this.scheduleDisposer == null) {
            // Subscribe to a change in the plan, generate a new schedule, and then broadcast that
            this.logger.info(`Setting up 'schedule' reaction`);
            this.scheduleDisposer = reaction(() => {
                trace();
                let plan = this.ui_store.selectedPlan;
                if (plan) {
                    let schedule = new ScheduleWithRules(plan, this.previousSchedule);
                    this.logger.info(`Regenerating schedule for plan ${plan.name}`);
                    schedule.createSchedule();
                    return schedule;
                } else {
                    this.logger.info(`No schedule generated, the provided plan was null`);
                }
                return null;
            }, schedule => {
                runInAction(() => {
                    this.logger.debug(`Assigning recently created schedule to this.schedule`);
                    this.schedule = schedule;
                });

                /*
                Required because if we want NG to pick up the change we have to be within a Zone
                Because the observation could come from anywhere (including an outside Pouch change), we need to wrap it.
                 */
                this.executeInZone(() => {
                    this.scheduleSubject.next(schedule);
                });
            }, {
                name: 'schedule',
                delay: 200,
            });
        }
    }

    private _createPreferencesReaction() {
        if (this.ssDisposer == null) {
            // Observe changes, and send these to the subject
            this.logger.info(`Setting up 'preferences' reaction`);
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
                this.executeInZone(() => {
                    this.preferencesSubject.next(prefs);
                });
            }, {
                name: 'preferences',
                equals: (a, b) => false // so that we ALWAYS fire to the subject
            });

        }
    }

    private _createSelectedPlanReaction() {
        if (this.spDisposer == null) {
            // If the selected plan UUID changes, lookup the plan and broadcast the change
            this.logger.info(`Setting up 'selected plan' reaction`);
            this.spDisposer = reaction(() => {
                trace();
                if (this.loggedInPerson) {
                    if (this.loggedInPerson.preferences) {
                        return this.loggedInPerson.preferences.selected_plan_uuid;
                    }
                }
                return null;
            }, uuid => {
                let plan = this.plans.findOfThisTypeByUUID(uuid);
                this.ui_store.setSelectedPlan(plan);
                this.executeInZone(() => {
                    this.selectedPlanSubject.next(plan);
                });
            }, {name: 'selected plan'});
        }
    }

    private _createUIStoreReaction() {
        if (this.uiDisposer == null) {
            this.logger.info(`Setting up 'ui store' reaction`);
            this.uiDisposer = reaction(() => {
                // trace();
                if (this.ui_store) {
                    let person = this.ui_store.loggedInPerson ? this.ui_store.loggedInPerson.name : '<no one>';
                    let plan = this.ui_store.selectedPlan ? this.ui_store.selectedPlan.name : '<none>';
                    this.logger.info(`UI Store changed, person:${person}, plan:${plan}`);
                }
                return this.ui_store;
            }, () => {
                this.executeInZone(() => {
                    this.uiStoreSubject.next(this.ui_store);
                });
            }, {name: 'ui store', equals: (a, b) => false});
        }
    }

    private _createLoggedInPersonReaction() {
        if (this.lipDisposer == null) {
            this.logger.info(`Setting up 'logged in person' reaction`);
            this.lipDisposer = reaction(() => {
                // trace();
                if (this.ui_store) {
                    return this.ui_store.loggedInPerson;
                }
                return null;
            }, (person) => {
                this.logger.debug("loggedInPerson$", `state change saw: ${person}`);
                this.executeInZone(() => {
                    this.loggedInPersonSubject.next(person);
                });
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

    private cleanupReactionDisposers() {
        if (this.ssDisposer) this.ssDisposer();
        if (this.uiDisposer) this.uiDisposer();
        if (this.lipDisposer) this.lipDisposer();
        if (this.scheduleDisposer) this.scheduleDisposer();
        if (this.spDisposer) this.spDisposer();

        this.ssDisposer = null;
        this.uiDisposer = null;
        this.lipDisposer = null;
        this.scheduleDisposer = null;
        this.spDisposer = null;
    }

    cleanupBecauseDBIsChanging() {
        // Destroy the reactions.
        this.cleanupReactionDisposers();

        // I *think* all the other states hang off of this one...
        this.ui_store.setLoggedInPerson(null);
    }

    logout() {
        // A good idea since we don't want these to be doing anything when we kill other refs.
        this.cleanupBecauseDBIsChanging();
        this.clear();
    }

    async setDatabase(db: SchedulerDatabase) {
        if (db == null) {
            this.logger.warn(`RootStore got new 'null' DB. Clearing items from store.`);
            this.clear();
        } else {
            this.logger.info(`RootStore got new DB: ${db.name}. Clearing all items from store and setting us as the DB's cache.`);
            this.clear();
            this.db = db;
            this.db.setCache(this);
            this.setupReactions();
            this.logger.info(`Yay. RootStore has a new DB (reactions are now live).`);
        }
    }

    private executeInZone(func) {
        if (this.zone) {
            this.zone.run(func);
        } else {
            func();
        }
    }
}

export {RootStore}