import {RootStore} from "../../store/root";
import {RESTServer} from "./server";
import {LoginResponse, ServerError, UserResponse, ValidationResponse} from "../../common/interfaces";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Person} from "../../scheduling/people";
import {Observable} from "rxjs/Observable";
import {forwardRef, Inject, Injectable} from "@angular/core";
import {Organization} from "../../scheduling/organization";
import {ReplicationStatus, SchedulerDatabase} from "./db";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {action, computed, observable} from "mobx-angular";
import {Storage} from '@ionic/storage';
import {OrmMapper} from "../mapping/orm-mapper";
import {catchError, debounceTime, filter, flatMap, map, take, timeout} from "rxjs/operators";
import {ConfigurationService} from "ionic-configuration-service";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/interval";
import {isDefined} from "ionic-angular/util/util";
import {reaction, runInAction} from "mobx";
import {ILifecycle, ILifecycleCallback} from "./interfaces";
import {Subscription} from "rxjs/Subscription";
import {ConnectivityService} from "../../common/network/connectivity";

const STATE_ROOT = 'state';

interface IState {
    loginToken: string;
    lastPersonUUID: string;
    lastOrganizationUUID: string;
    isForcedOffline: boolean;
}

@Injectable()
class SchedulerServer implements ILifecycle {
    private logger: Logger;
    @observable private _state: IState;
    private _previousState: IState;

    private dbSubject: Subject<SchedulerDatabase>;
    private _db: SchedulerDatabase;
    private dbChangeTrackingSubscription: Subscription;

    constructor(@Inject(forwardRef(() => RootStore)) private store,
                private restAPI: RESTServer,
                private storage: Storage,
                private connectivity: ConnectivityService,
                private ormMapper: OrmMapper,
                private configurationService: ConfigurationService
    ) {
        this.logger = LoggingWrapper.getLogger('service.bridge');
        this.dbSubject = new BehaviorSubject<SchedulerDatabase>(null);
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

    get state(): IState {
        return this._state;
    }

    @computed get loggedIn(): boolean {
        // atm: this is cleared if a validate login gets 'bad'
        // TODO: Adjust for true offline case.
        if (this.state) {
            return this.state.loginToken != null;
        }
        return false;
    }

    raiseExceptionIfNotOnline(method: string) {
        if (!this.connectivity.isOnline) {
            throw new Error(`Cannot perform operation ${method}, we are not online`);
        }
    }

    async loginUser(username: string, password: string): Promise<LoginResponse> {
        this.logger.info(`Requesting user info from server: ${username}`);
        await this.asyncLoadState();

        this.raiseExceptionIfNotOnline('loginUser');

        try {
            let res: LoginResponse = await this.restAPI.login(username, password);
            this.setLoginTokenFromUserResponse(res.ok, res.user || null);

            // as far as people + orgs existing in the DB
            // we rely on replication to set that up.
            // Initial people/org is done on the server. it's expected that first
            // time replication brings that data to the client
            return res;
        } catch (err) {
            throw new ServerError(err);
        }
    }

    @action
    async asyncLogout() {
        this.state.lastOrganizationUUID = null;
        this.state.lastPersonUUID = null;
        this.state.loginToken = null;
        this._previousState = undefined;
        await this.asyncSaveState().then(() => {
            this.logger.info(`User logged out, state saved.`);
        });
    }

    @action setLoginTokenFromUserResponse(good: boolean, user: UserResponse = null) {
        let uiStore = this.store.ui_store;

        if (good) {
            this.logger.info(`Login: set login token to ${user.logintoken || ''}, last person to: ${user.uuid || ''}`);
            this.restAPI.loginToken = user.logintoken;
            this.state.loginToken = user.logintoken;
            this.state.lastPersonUUID = user.uuid;
            this.state.lastOrganizationUUID = user.organization_uuid;
        } else {
            this.restAPI.loginToken = null;
            this.state.loginToken = null;
            this.state.lastPersonUUID = null;
            this.state.lastOrganizationUUID = null;
            this.logger.info(`Login: Clearing state token/uuid because login not OK`);
        }
        uiStore.setLoginTokenValidated(good);
    }

    @action
    async validateLoginToken(token: string): Promise<ValidationResponse> {
        // If no 'person uuid', need to login
        await this.asyncLoadState();
        this.logger.info(`Validating login token: ${SWBSafeJSON.stringify(token)}`);

        this.raiseExceptionIfNotOnline('validateLoginToken');
        try {
            let vr = await this.restAPI.validateLoginToken(token);
            this.setLoginTokenFromUserResponse(vr.ok, vr.user);
            return vr;
        } catch (e) {
            throw new ServerError(e);
        }
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

    async asyncLoadState(): Promise<object> {
        if (this._state == null) {
            let newState = await this.storage.get(STATE_ROOT) || {
                lastPersonUUID: null,
                lastOrganizationUUID: null,
                loginToken: null,
                isForcedOffline: false,
            };

            runInAction(() => {
                this._state = newState;
            });

            this.logger.debug(`Loading state... ${JSON.stringify(this._state)}`);

            // Restore current state to the object
            this.connectivity.setOverrideEnabled(this.state.isForcedOffline);

            // Listen to the connectivity service. If the flag to force it changes, save that here.
            reaction(() => {
                return this.connectivity.overrideEnabled;
            }, (value) => {
                this._state.isForcedOffline = value;
                this.asyncSaveState().then(() => {
                    this.logger.debug(`Saved state because 'forced' flag changed`);
                });
            })
        }
        return this.state;
    }

    private async asyncSaveState() {
        await this.storage.set(STATE_ROOT, this._state);
    }

    hasStateChangedSinceLastLifecycleRun(): boolean {
        let areSet = isDefined(this._previousState) && isDefined(this._state);
        if (areSet) {
            // Only want to compare some fields, not all
            let orgSame = this._state.lastOrganizationUUID == this._previousState.lastOrganizationUUID;
            let personSame = this._state.lastPersonUUID == this._previousState.lastPersonUUID;
            let tokenSame = this._state.loginToken == this._previousState.loginToken;
            if (orgSame && personSame && tokenSame) {
                return false;
            }
        }
        return true;
    }

    captureStateAsPrevious() {
        this._previousState = Object.assign({}, this._state);
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
        await this.asyncLoadState();

        // If the state is the same, do nothing. As nothing has changed.
        if (this.hasStateChangedSinceLastLifecycleRun() === false) {
            this.logger.info('asyncRunStartupLifecycle', 'Ignored - the state hasnt changed');
            return;
        }

        if (!this.state.loginToken) {
            this.logger.debug('asyncRunStartupLifecycle', `Login token null, show login page`);
            callback.showLoginPage(`Login token null`);
            return false;
        }

        // Are we online? can we validate?
        if (this.connectivity.isOnline) {
            try {
                let vr = await this.validateLoginToken(this.state.loginToken);
                if (!vr.ok) {
                    this.logger.debug('asyncRunStartupLifecycle', `Login token invalid, show login page`);
                    callback.showLoginPage(`Login token invalid: ${SWBSafeJSON.stringify(vr)}`);
                    return false;
                }
            } catch (err) {
                if (err instanceof ServerError) {
                    if (err.isHTTPServerNotThere) {
                        this.logger.warn(`Assume server is toast (got back: ${err}`);
                        // fall through and continue
                    } else {
                        callback.showError(err);
                    }
                } else {
                    callback.showError(err);
                }
            }

        } else {
            this.logger.warn(`We're offline. We have a token and we're gonna assume it is OK.`);
        }
        return this.asyncRunStartupLifecycleAfterLogin(callback, timeout);
    }

    async asyncRunStartupLifecycleAfterLogin(callback: ILifecycleCallback, timeout: number = Infinity): Promise<boolean> {
        // If no lastOrganizationUUID UUID, loginUser() didn't do its job.
        // Login should validate token, check for Person object locally (direct DB access)
        // and also set this.state.lastPersonUUID and this.state.lastOrganizationUUID
        if (!this.state.lastOrganizationUUID) {
            this.logger.debug('asyncRunStartupLifecycle', `lastOrganizationUUID nil, show login page`);
            callback.showLoginPage(`lastOrganizationUUID is nil on server.state`);
            return false;
        }
        if (!this.state.lastPersonUUID) {
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

        this.captureStateAsPrevious();
        callback.applicationHasStarted(allGood);
        return allGood;
    }

    async setDatabase(dbInstance: SchedulerDatabase) {
        if (dbInstance != this._db) {
            if (this.db) {
                await this.db.asyncStopReplication();
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
        let organizationUUID = this.state.lastOrganizationUUID;
        let personUUID = this.state.lastPersonUUID;
        if (!organizationUUID) {
            throw new Error(`Cannot setup DB undefined/null organization. organizationUUID is required`);
        }
        if (!personUUID) {
            throw new Error(`Cannot setup DB undefined/null person. personUUID is required`);
        }

        this.logger.info('setupDBFromState', `Beginning DB setup for person:${personUUID} and org:${organizationUUID}`);
        let name = Organization.dbNameFor(organizationUUID);
        let newDb = new SchedulerDatabase(name, this.ormMapper);

        // Clear logged in person and any other 'db dependent' state
        // This should cause the various subjects on RootStore to fire, hopefully with nulls
        this.logger.info('setupDBFromState', `Clearing RootStore state...`);
        this.store.clearDependentState();

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

        // load what we have (wait while this happens)
        this.logger.info('setupDBFromState', `Loading from DB...`);
        await this.store.loadDataFromStorage();

        // Start replication
        let couch = this.configurationService.getValue('server')['couch'];
        newDb.startReplicationFor(couch, organizationUUID);

        // Wait for replication to go quiet (no updates in a bit)
        this.logger.info('setupDBFromState', `Waiting for replication to come up`);
        await this.waitForReplicationToQuietenDown(newDb);

        this.logger.info('setupDBFromState', `Checking we can find ${personUUID}`);
        let person = await this.asyncWaitForDBToContainObjectWithUUID(personUUID, newDb, responseTimeout);
        if (person instanceof Person) {
            this.store.ui_store.setLoggedInPerson(person);
        } else {
            throw new Error(`Object with UUID ${personUUID} was loaded, but it's not an instance of Person! It's: ${person.constructor.name}`);
        }

        // We want that 'defaults' one to be alive so it triggers when we first load the state
        // this.checkForDefaults();
    }

    async asyncWaitForDBToContainObjectWithUUID(uuid, newDb, responseTimeout: number): Promise<ObjectWithUUID> {
        // Poll until we can find the person.
        // First poll can be reasonably quick because we do these only after replication has run and quietened for 1s
        this.logger.info('setupDBFromState', `Waiting for ${uuid}`);

        if (responseTimeout == Infinity) {
            responseTimeout = 15000;
        }

        await Observable.timer(150, 1500)
            .pipe(
                flatMap(() => {
                    this.logger.debug(`Seeing if ${uuid} exists...`);
                    return Observable.from(newDb.async_DoesObjectExistWithUUID(uuid));
                }),
                filter((v: boolean) => v),
                timeout(responseTimeout),
                take(1), // take the first successful, then terminate
                catchError(err => {
                    throw new Error(`E1334: didn't find ID ${uuid} within ${responseTimeout / 1000}s)). Err: ${err}`);
                })
            ).toPromise();

        this.logger.info('setupDBFromState', `Woot! We can see the ${uuid} in the DB`);

        // Make sure store logged in person is set
        // Again, causing various subjects on RootStore to fire, getting new state & objects
        let theObject = await newDb.async_LoadObjectWithUUID(uuid);
        if (!theObject) {
            throw new Error(`Cannot find object with UUID ${uuid}, setupDBFromState failed`);
        }
        return theObject;
    }

    private async waitForReplicationToQuietenDown(newDb: SchedulerDatabase) {
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

    private checkForDefaults(store: RootStore) {
        let theStore = this.store;
        let person = theStore.ui_store.loggedInPerson;
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
}

export {
    SchedulerServer,
    IState,

}