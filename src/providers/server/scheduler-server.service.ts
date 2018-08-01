import {RootStore} from "../../store/root";
import {RESTServer} from "./server";
import {LoginResponse, RoleSetResponse, ServerError} from "../../common/interfaces";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Person} from "../../scheduling/people";
import {Observable} from "rxjs/Observable";
import {forwardRef, Inject, Injectable} from "@angular/core";
import {Organization} from "../../scheduling/organization";
import {IReplicationNotification, ReplicationStatus, SchedulerDatabase} from "./db";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {action, computed} from "mobx-angular";
import {OrmMapper} from "../mapping/orm-mapper";
import {catchError, debounceTime, filter, flatMap, map, take, timeout} from "rxjs/operators";
import {ConfigurationService} from "ionic-configuration-service";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/interval";
import {ILifecycle, ILifecycleCallback} from "./interfaces";
import {Subscription} from "rxjs/Subscription";
import {ConnectivityService} from "../../common/network/connectivity";
import {Team} from "../../scheduling/teams";
import {Plan} from "../../scheduling/plan";
import {Role} from "../../scheduling/role";
import {StateProvider} from "../state/state";
import {AuthorizationService, TokenStates} from "../token/authorization.service";

@Injectable()
class SchedulerServer implements ILifecycle, IReplicationNotification {
    private logger: Logger;

    private dbSubject: Subject<SchedulerDatabase>;
    private _db: SchedulerDatabase;
    private dbChangeTrackingSubscription: Subscription;
    private lifecycleRunning: boolean;

    constructor(@Inject(forwardRef(() => RootStore)) private store,
                private restAPI: RESTServer,
                private auth: AuthorizationService,
                private state: StateProvider,
                private connectivity: ConnectivityService,
                private ormMapper: OrmMapper,
                private configurationService: ConfigurationService
    ) {
        this.logger = LoggingWrapper.getLogger('service.bridge');
        this.dbSubject = new BehaviorSubject<SchedulerDatabase>(null);

        // assume so, to begin with.
        this.lifecycleRunning = true;
    }

    isUsernameAvailableAndGood(username: string): Observable<string> {
        return this.restAPI.isUsernameAvailableAndGood(username);
    }

    get db$(): Observable<SchedulerDatabase> {
        return this.dbSubject;
    }

    get db(): SchedulerDatabase {
        return this._db;
    }

    get isReady(): boolean {
        // ready to show stuff?
        // i.e: lifecycle has completed one way or the other
        return !this.lifecycleRunning;
    }

    get isLoggedIn(): boolean {
        // atm: this is cleared if a validate login gets 'bad'
        // TODO: Adjust for true offline case.
        if (this.state) {
            return this.state.isLoggedIn;
        }
        return false;
    }

    @computed get isOnline(): boolean {
        return this.connectivity.isOnline;
    }

    raiseExceptionIfNotOnline(method: string) {
        if (!this.connectivity.isOnline) {
            throw new Error(`Cannot perform operation ${method}, we are not online`);
        }
    }

    async loginUser(username: string, password: string): Promise<LoginResponse> {
        this.raiseExceptionIfNotOnline('loginUser');

        try {
            this.logger.info(`Logging in user: ${username}`);
            return await this.auth.login(username, password).toPromise();
        } catch (err) {
            throw new ServerError(err);
        }
    }

    @action
    async asyncLogout(clearToken: boolean = true) {
        this.state.logout();
        if (clearToken) {
            this.state.clearTokens();
        }

        this.store.logout();
        await this.state.asyncSaveState().then(() => {
            this.logger.info(`User logged out, state saved.`);
        });
    }

    async hasEmailBeenConfirmed(email: string): Promise<boolean> {
        this.raiseExceptionIfNotOnline('hasEmailBeenConfirmed');
        return this.restAPI.hasEmailBeenConfirmed(email);
    }

    async saveOrganization(organization: Organization): Promise<Organization> {
        return await this._db.async_storeOrUpdateObject(organization) as Organization;
    }

    async savePerson(person: Person): Promise<Person> {
        return await this._db.async_storeOrUpdateObject(person) as Person;
    }

    async saveTeam(team: Team): Promise<Team> {
        return await this._db.async_storeOrUpdateObject(team) as Team;
    }

    async saveRole(role: Role): Promise<Role> {
        return await this._db.async_storeOrUpdateObject(role) as Role;
    }

    async savePlan(plan: Plan): Promise<Plan> {
        return await this._db.async_storeOrUpdateObject(plan) as Plan;
    }

    async deleteTeam(team: Team) {
        return await this._db.asyncDeleteObject(team);
    }

    setStore(store: RootStore) {
        this.store = store;
    }

    async db_findPersonByEmail(email: string): Promise<Person> {
        if (!this._db) {
            throw new Error(`cannot search for person by email ${email}, no DB`);
        }
        let query = {selector: {type: 'Person', email: email}};
        let all_objects_of_type = await this._db.findBySelector<Person>(query, true);
        if (all_objects_of_type && all_objects_of_type.length > 0) {
            return all_objects_of_type[0];
        }
        return null;
    }

    async db_findByUUID<T extends ObjectWithUUID>(uuid: string, useCache: boolean = true): Promise<T> {
        return await this._db.async_LoadObjectWithUUID(uuid, useCache) as T;
    }

    /*
    Basic idea is that you ALWAYS call this back (after login, validate, etc).
    This method is the one thing that does setup, in order.
    It is expected that you have logged in in the past, the token is valid and the user/org should exist in the DB.

    This method will:
     - load the saved state
     - if online, try to validate the login token / load the user.
     - start replication
     - check for valid person/uuid, and wait for these to 'exist' in the db (think: time taken for first replication)
     */
    async asyncRunStartupLifecycle(callback: ILifecycleCallback, timeout: number = Infinity): Promise<boolean> {
        this.lifecycleRunning = true;

        try {
            // If the state is the same, do nothing. As nothing has changed.
            if (this.state.hasStateChangedSinceLastLifecycleRun() === false) {
                this.logger.info('asyncRunStartupLifecycle', 'Ignored - the state hasnt changed');
                return;
            }

            // If we are offline, we can check the token for expiry.
            // But then, we need to be online to refresh it.
            // So. Um. For now, do nothing?

            // Are we online? can we validate?
            if (this.connectivity.isOnline) {
                //
                // Tokens, tokens, tokens.
                //
                // Quick check here to see if token is OK/needs refresh
                // Simply access our own user record.
                // That's enuf to force token refresh

                // NOT checking for token expiry.
                // Because: it'll expire in 15m, but could be refreshed fine.
                //
                // So, just let it fall through to a real operation
                //

                try {
                    await this.restAPI.getOwnUserDetails();
                } catch (err) {
                    if (err instanceof ServerError) {
                        if (err.isHTTPServerNotThere) {
                            this.logger.warn(`Assume server is toast (got back: ${err}`);
                        }
                    } else if (this.auth.isTokenExpiryException(err)) {
                        callback.showLoginPage(`Login token invalid: ${SWBSafeJSON.stringify(err)}`);
                        return false;
                    } else {
                        callback.showError(err);
                    }
                }
            } else {
                this.logger.warn(`We're offline. We have a token and we're gonna assume it is OK.`);
            }
            return await this.asyncRunStartupLifecycleAfterLogin(callback, timeout);
        } finally {
            this.lifecycleRunning = false;
        }
    }

    async asyncRunStartupLifecycleAfterLogin(callback: ILifecycleCallback, timeout: number = Infinity): Promise<boolean> {

        // If no lastOrganizationUUID UUID, loginUser() didn't do its job.
        // Login should validate token, check for Person object locally (direct DB access)
        // and also set this.state.lastPersonUUID and this.state.lastOrganizationUUID
        let theState = this.state.state;
        if (theState.lastOrganizationUUID == null) {
            this.logger.debug('asyncRunStartupLifecycle', `lastOrganizationUUID nil, show login page`);
            callback.showLoginPage(`lastOrganizationUUID is nil on server.state`);
            return false;
        }
        if (theState.lastPersonUUID == null) {
            this.logger.debug('asyncRunStartupLifecycle', `lastPersonUUID nil, show login page`);
            callback.showLoginPage(`lastPersonUUID is nil on server.state`);
            return false;
        }

        // OK. At this stage we are good to have the DB come up against this
        // organization (keyed off Person).
        let allGood = true;
        try {
            await this.setupDBFromState(callback, timeout);
        } catch (err) {
            callback.showError(err);
            allGood = false;
        }

        this.state.captureStateAsPrevious();
        await this.state.asyncSaveState();
        callback.applicationHasStarted(allGood);
        return allGood;
    }

    async setDatabase(dbInstance: SchedulerDatabase) {
        if (dbInstance != this._db) {
            if (this.db) {
                await this.db.asyncCleanUp();
            }

            if (this.dbChangeTrackingSubscription) {
                this.dbChangeTrackingSubscription.unsubscribe();
                this.dbChangeTrackingSubscription = null;
            }

            this.logger.info(`Setting db ${dbInstance} on self and sending to store`);
            this._db = dbInstance;
            await this.store.setDatabase(dbInstance);
            this.dbSubject.next(this._db);
        }
    }

    private async setupDBFromState(callback: ILifecycleCallback, responseTimeout: number = Infinity) {
        let iState = this.state.state;
        let organizationUUID = iState.lastOrganizationUUID;
        let personUUID = iState.lastPersonUUID;

        if (!organizationUUID) {
            throw new Error(`Cannot setup DB undefined/null organization. organizationUUID is required`);
        }
        if (!personUUID) {
            throw new Error(`Cannot setup DB undefined/null person. personUUID is required`);
        }
        if (!this.state.loginToken) {
            throw new Error(`Cannot setup DB. jwtToken is required (all DB access needs a token)`);
        }

        this.logger.info('setupDBFromState', `Beginning DB setup for person:${personUUID} and org:${organizationUUID}`);
        let name = Organization.dbNameFor(organizationUUID);

        let newDb = new SchedulerDatabase(name, this.state, this.ormMapper);
        newDb.notificationDelegate = this;

        // Clear logged in person and any other 'db dependent' state
        // This should cause the various subjects on RootStore to fire, hopefully with nulls
        this.logger.info('setupDBFromState', `Clearing RootStore state...`);
        this.store.cleanupBecauseDBIsChanging();

        // Wait until the DB is ready and set it on the rootstore
        this.logger.info('setupDBFromState', `Waiting for DB ready...`);
        let dbReadyResult = await newDb.readyEvent.pipe(
            take(1) // so that the BehaviorSubject returns us something
        ).toPromise();
        this.logger.info('setupDBFromState', `DB ready: ${dbReadyResult}`);

        // Set this DB on the RootStore
        await this.setDatabase(newDb);

        // From this point, assume all is well.
        // Show a 'loading...' page.
        callback.applicationIsStarting();

        // Start replication
        let couch = this.configurationService.getValue('server')['couch'];
        await newDb.startReplicationFor(couch, organizationUUID);

        // Wait for replication to go quiet (no updates in a bit)
        // Me: Don't need this now that the DB does a sync(non-live) FIRST, followed by setting up live.
        // this.logger.info('setupDBFromState', `Waiting for replication to come up`);
        // await this.waitForReplicationToQuietenDown(newDb);

        // load what we have (wait while this happens)
        this.logger.info('setupDBFromState', `Loading from DB...`);
        await this.store.loadDataFromStorage();

        this.logger.info('setupDBFromState', `Checking we can find person: ${personUUID}`);
        let person = await this.asyncWaitForDBToContainObjectWithUUID(personUUID, newDb, responseTimeout);

        if (person instanceof Person) {
            // Does this person need a 're-save'?
            // This can happen if the person was created by the server and doesn't have all the fields we map here on the client
            //
            // The ORM will instantiate using the factory. This will likely set good defaults on the object (e,g: non-null preferences, [] unavail, and a default avail).
            // Yet the DB version won't have any of that.
            //
            // We need the doc, to be sure.
            //
            let doc = await this.db.async_docWithUUID(person.uuid);
            if (!doc) {
                throw new Error(`Tried to find Person doc with ID ${person.uuid} but it's not in the DB. WTF?`);
            }
            let docKeys = Object.keys(doc);
            // console.log(`Doc: ${SWBSafeJSON.stringify(doc)}`);
            let hasPrefs = docKeys.indexOf('preferences') > -1;
            let hasAvail = docKeys.indexOf('availability') > -1;
            let hasUnAvail = docKeys.indexOf('unavailable') > -1;

            if (!hasUnAvail || !hasAvail || !hasPrefs) {
                this.logger.warn(`Resaving ${person.name} because its missing some needed info`);
                this.logger.warn(`Keys: ${docKeys}`);
                if (!hasPrefs) this.logger.warn(` - No preferences`);
                if (!hasAvail) this.logger.warn(` - No availability`);
                if (!hasUnAvail) this.logger.warn(` - No unavailable`);
                await this.savePerson(person);
            }

            this.logger.info(`${person.name} to be the logged in person`);
            this.store.ui_store.setLoggedInPerson(person);

            // We want that 'defaults' o ne to be alive so it triggers when we first load the state
            this.checkForDefaults(person);
        } else {
            throw new Error(`Object with UUID ${personUUID} was loaded, but it's not an instance of Person! It's: ${SWBSafeJSON.stringify(person)}`);
        }
    }

    async asyncWaitForDBToContainObjectWithUUID(uuid, newDb, responseTimeout: number): Promise<ObjectWithUUID> {
        // Poll until we can find the person.
        // First poll can be reasonably quick because we do these only after replication has run and quietened for 1s
        this.logger.info('asyncWaitForDBToContainObjectWithUUID', `Waiting for ${uuid}`);

        if (responseTimeout == Infinity) {
            responseTimeout = 15000;
        }

        await Observable.timer(150, 1500)
            .pipe(
                flatMap(() => {
                    this.logger.debug('asyncWaitForDBToContainObjectWithUUID', `Seeing if ${uuid} exists...`);
                    return Observable.from(newDb.async_DoesObjectExistWithUUID(uuid));
                }),
                filter((v: boolean) => v),
                timeout(responseTimeout),
                take(1), // take the first successful, then terminate
                catchError(err => {
                    throw new Error(`E1334: didn't find ID ${uuid} within ${responseTimeout / 1000}s)). Err: ${err}`);
                })
            ).toPromise();

        this.logger.info('asyncWaitForDBToContainObjectWithUUID', `Woot! We can see ${uuid} in the DB`);

        // Make sure store logged in person is set
        // Again, causing various subjects on RootStore to fire, getting new state & objects
        let theObject = await newDb.async_LoadObjectWithUUID(uuid);
        if (!theObject) {
            throw new Error(`Cannot find object with UUID ${uuid}, setupDBFromState failed`);
        }
        return theObject;
    }

    async waitForReplicationToQuietenDown(newDb: SchedulerDatabase) {
        await newDb.replicationNotifications$.pipe(
            map(v => {
                this.logger.info(`Replication doing something: ${v}`);
                return v;
            }),
            debounceTime(1000),
            filter((v: ReplicationStatus) => {
                return v == ReplicationStatus.Idle || v == ReplicationStatus.Paused;
            }),
            take(1)
        ).toPromise();
        this.logger.info('Replication has been silent for a while');
    }

    private checkForDefaults(person: Person) {
        let theStore = this.store;
        if (!person) {
            throw new Error('Unable to start defaults check, no person logged in');
        }
        let prefs = person.preferences;
        if (!prefs) {
            throw new Error('Unable to start defaults check, no preferences');
        }
        this.logger.info(`Checking to see if we have a default selected plan...`);
        let isPlanSet = prefs.selected_plan_uuid != null;
        let plansMgr = theStore.plans;
        let planDoesntExist = isPlanSet && plansMgr.findOfThisTypeByUUID(prefs.selected_plan_uuid) == null;
        if (!isPlanSet || planDoesntExist) {
            if (!isPlanSet) {
                this.logger.info(`No plan set`);
            }
            if (planDoesntExist) {
                this.logger.info(`Plan set to ${person.preferences.selected_plan_uuid}, but I can't find that...`);
            }
            if (plansMgr.plansByDateLatestFirst.length > 0) {
                this.logger.info(`Setting default selected plan to: ${plansMgr.plansByDateLatestFirst[0].name}`);
                person.preferences.setSelectedPlan(plansMgr.plansByDateLatestFirst[0]);
            } else {
                this.logger.info(`Tried to select a default plan, but no plans in the DB for us to choose from :(`);
            }
        } else {
            this.logger.info(`We do... the default plan is: ${person.preferences.selected_plan_uuid}`);
        }
    }

    async registerNewUser(name: string, email: string, pwd: string): Promise<Person> {
        this.raiseExceptionIfNotOnline('registerNewUser');
        let lr = await this.restAPI.registerNewUser(name, email, pwd);
        if (lr.ok) {
            return Person.createFromUserResponse(lr.user);
        }
        return null;
    }

    async getRoleSets(): Promise<RoleSetResponse[]> {
        this.raiseExceptionIfNotOnline('getRoleSets');
        return this.restAPI.getRoleSets();
    }

    async sendInvites(toPeople: Person[]) {
        // Ask the server to do this for us
        this.raiseExceptionIfNotOnline('sendInvites');

        // - send them
        let response = await this.restAPI.sendInvites(toPeople);

        // - record we've done this on our end?
        this.logger.info(`Sent invites: ${SWBSafeJSON.stringify(response)}`);
        return response
    }

    async movePersonToOrganization(organizationUUID: string) {
        this.raiseExceptionIfNotOnline('movePersonToOrganization');

        let person = this.store.loggedInPerson;
        if (person == null) {
            throw new Error(`Cannot move. No person is logged in`);
        }
        await this.restAPI.movePersonToOrganization(person, organizationUUID);
    }

    async deleteAllContentFromDatabase() {
        // Clear the in memory store
        this.store.clear();

        // Untrack all objects and clear the db content
        // Don't delete the person, their prefs, nor their org.
        let person = this.store.loggedInPerson;
        let skip = [person.uuid, person.preferences.uuid, person.organization.uuid, person.availability.uuid];
        await this.db.deleteAllContentFromDatabase(skip);
    }

    get authTokenLifecycleNotifications(): Subject<TokenStates> {
        return this.auth.tokenLifecycleSubject;
    }

    async asyncTokenRejectedInContinuousReplication() : Promise<boolean> {
        // Oh really?
        // Ask auth to refresh. This will attempt to do so, saving the refresh token in state.
        // It's async so that the caller can wait on it, and do something useful when it's back.
        await this.auth.refresh().toPromise();
        return this.auth.isAuthenticatedAndNotExpired();
    }
}

export {
    SchedulerServer,
}