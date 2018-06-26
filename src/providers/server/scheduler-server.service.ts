import {RootStore} from "../../store/root";
import {RESTServer} from "./server";
import {LoginResponse, UserResponse, ValidationResponse} from "../../common/interfaces";
import {SafeJSON} from "../../common/json/safe-stringify";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Person} from "../../scheduling/people";
import {Observable} from "rxjs/Observable";
import {forwardRef, Inject, Injectable} from "@angular/core";
import {Organization} from "../../scheduling/organization";
import {SchedulerDatabase} from "./db";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {Subject} from "rxjs/Subject";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {action, computed, observable} from "mobx-angular";
import {Storage} from '@ionic/storage';
import {OrmMapper} from "../mapping/orm-mapper";
import {catchError, filter, flatMap, take, timeout} from "rxjs/operators";
import {ConfigurationService} from "ionic-configuration-service";
import "rxjs/add/observable/fromPromise";
import "rxjs/add/observable/interval";
import {ObjectUtils} from "../../pages/page-utils";
import {isUndefined} from "util";
import {isDefined} from "ionic-angular/util/util";
import {runInAction} from "mobx";

const STATE_ROOT = 'state';

interface IState {
    loginToken: string;
    lastPersonUUID: string;
    lastOrganizationUUID: string;
}

interface ILifecycleCallback {
    showLoginPage(reason: string);

    showCreateOrInvitePage(reason: string);

    showError(message: string);
}

interface ILifecycle {
    asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean>;
}


@Injectable()
class SchedulerServer implements ILifecycle {
    private logger: Logger;
    @observable private _state: IState;
    private _previousState: IState;

    private dbSubject: Subject<SchedulerDatabase>;
    private _db: SchedulerDatabase;

    constructor(@Inject(forwardRef(() => RootStore)) private store,
                private restAPI: RESTServer,
                private storage: Storage,
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

    get loggedIn(): boolean {
        // atm: this is cleared if a validate login gets 'bad'
        // TODO: Adjust for true offline case.
        if (this.state) {
            return this.state.loginToken != null;
        }
        return false;
    }

    async loginUser(username: string, password: string): Promise<LoginResponse> {
        this.logger.info(`Requesting user info from server: ${username}`);
        await this.asyncLoadState();

        let res: LoginResponse = await this.restAPI.login(username, password);
        this.setLoginTokenFromUserResponse(res.ok, res.user || null);

        // as far as people + orgs existing in the DB
        // we rely on replication to set that up.
        // Initial people/org is done on the server. it's expected that first
        // time replication brings that data to the client

        await this.asyncSaveState();
        return res;
    }

    @action
    async asyncLogout() {
        this.state.lastOrganizationUUID = null;
        this.state.lastPersonUUID = null;
        this.state.loginToken = null;
        await this.asyncSaveState();
        this.logger.info(`User logged out, state saved.`);
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
        this.logger.info(`Validating login token: ${SafeJSON.stringify(token)}`);

        let vr = await this.restAPI.validateLoginToken(token);

        this.setLoginTokenFromUserResponse(vr.ok, vr.user);

        return vr;
    }

    async hasEmailBeenConfirmed(email: string): Promise<boolean> {
        return this.restAPI.hasEmailBeenConfirmed(email);
    }

    // @action
    // async syncUserWithServer(serverUser: UserResponse): Promise<UserResponse> {
    //     let localPerson: Person;
    //     let munge = false;
    //
    //     if (!serverUser.uuid) {
    //         // No UUID set. Assume this is the "munge" scenario.
    //         // This in theory only happens when I'm testing myself, and have created user instances on the server (via createneil.py)
    //         localPerson = await this.db_findPersonByEmail(serverUser.email);
    //         this.logger.warn(`MUNGE: Going to create a local user in Pouch with ${serverUser.email}`);
    //         if (localPerson == null) {
    //             localPerson = this.createNewPersonFromUserResponse(serverUser);
    //         } else {
    //             if (localPerson.serverId != serverUser.id) {
    //                 this.logger.info(`Updating local person ${localPerson.email} to have server user ID: ${serverUser.id}`);
    //                 localPerson.serverId = serverUser.id;
    //             }
    //         }
    //
    //         // Update our local pouch store
    //         this.logger.warn(`MUNGE: Created new local Person ${localPerson}`);
    //
    //         // Update the remote server (with the new users uuid)
    //         if (serverUser.uuid != localPerson.uuid) {
    //             serverUser.uuid = localPerson.uuid;
    //             await this.restAPI.saveUser(serverUser);
    //             this.logger.warn(`MUNGE Done. Falling through to rest of init.`);
    //         }
    //         munge = true;
    //     } else {
    //         // The user supplied an ID. Does that user exist here?
    //         localPerson = await this.db_findByUUID(serverUser.uuid) as Person;
    //         if (!localPerson) {
    //             // This can happen, when I've deleted the local DB, but NOT the remote. So remote still references UUIDs that no longer exist,
    //             this.logger.warn(`Server says this user has ID ${serverUser.uuid} but no such user exists in the local DB`);
    //             localPerson = this.createNewPersonFromUserResponse(serverUser);
    //             munge = true;
    //         }
    //     }
    //
    //     await this.savePerson(localPerson);
    //     await this.ensureUserHasOrganization(serverUser, localPerson, munge);
    //
    //     this.store.ui_store.preferences.setLoggedInPersonUUID(localPerson.uuid);
    //
    //     return serverUser;
    // }

    // private createNewPersonFromUserResponse(serverUser: UserResponse): Person {
    //     // if (!serverUser.uuid) {
    //     //     throw new Error('No UUID specified in server response. Cannot create user');
    //     // }
    //     let person = new Person([serverUser.first_name, serverUser.last_name].join(" ").trim(), serverUser.uuid);
    //     person.email = serverUser.email;
    //     person.serverId = serverUser.id;
    //     this.store.people.add(person);
    //     return person;
    // }

    // @action
    // private async ensureUserHasOrganization(user: UserResponse, localPerson: Person, munge: boolean): Promise<Organization> {
    //     // Is there an org associated with us on the server?
    //     if (!user.organization_id) {
    //         this.logger.info(`This user doesn't have an organization on the server. Creating one.`);
    //         let orgResponse = await this.restAPI.createOrganization(user);
    //
    //         // Link to the user, on the server
    //         user.organization_id = orgResponse.id;
    //         let userSaveResp = await this.restAPI.saveUser(user);
    //         this.logger.info(`User resp after saving with org: ${JSON.stringify(userSaveResp)}`);
    //
    //         // Create this here in Pouch.
    //         let org = await this.createNewOrganizationInPouch(orgResponse.name);
    //
    //         // Now we have it's UUID, save that on the servers copy
    //         orgResponse.uuid = org.uuid;
    //         await this.restAPI.updateOrganization(orgResponse);
    //
    //         // Make sure our local user is pointing to this pouch org.
    //         localPerson.organization = org;
    //         await this.store.asyncSaveOrUpdateDb(localPerson);
    //
    //         return org;
    //     } else {
    //         // They have an org on the server. Get it.
    //         this.logger.info(`User has organization ID: ${user.organization_id}`);
    //         let orgResponse = await this.restAPI.getOrganization(user.organization_id);
    //
    //         // Wait! the org on the server isn't tied to an org in pouch.
    //         if (!orgResponse.uuid) {
    //             this.logger.info(`Got organization ${user.organization_id} but it has no UUID! Going to create a new pouch org and assign it`);
    //             let pouchOrg = await this.createNewOrganizationInPouch(orgResponse.name);
    //             orgResponse.uuid = pouchOrg.uuid;
    //             await this.restAPI.updateOrganization(orgResponse);
    //         }
    //
    //         // Find the org in pouch
    //         let org = await this.db_findByUUID(orgResponse.uuid) as Organization;
    //         if (!org) {
    //             let message = `No organization exists with UUID: ${orgResponse.uuid}`;
    //             if (munge) {
    //                 this.logger.warn(message + " ... creating it (part of MUNGE).");
    //                 org = new Organization(`Munged org for ${user.email}`);
    //                 org._id = orgResponse.uuid;
    //                 await this.saveOrganization(org);
    //             } else {
    //                 throw new Error(message);
    //             }
    //         }
    //
    //         // Make sure the user points at this org.
    //         if (!localPerson.organization) {
    //             this.logger.info(`Logged in person has no organization. Assigning: ${org.name}`);
    //             localPerson.organization = org;
    //         } else {
    //             if (localPerson.organization.uuid != org.uuid) {
    //                 this.logger.info(`Logged in person has association to wrong org. Assigning to ${org.name}`);
    //                 localPerson.organization = org;
    //             }
    //         }
    //         this.logger.info(`Person ${localPerson} with org: ${org}`);
    //         return org as Organization;
    //     }
    // }

    // private async createNewOrganizationInPouch(name: string): Promise<Organization> {
    //     // Create this here in Pouch.
    //     let org = new Organization(name);
    //     return await this.db.async_store_or_update_object(org) as Organization;
    // }

    async saveOrganization(organization: Organization): Promise<Organization> {
        // TODO: Also update the Django server
        return await this._db.async_store_or_update_object(organization) as Organization;
    }

    async savePerson(person: Person): Promise<Person> {
        // TODO: Also update the Django server
        return await this._db.async_store_or_update_object(person) as Person;
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
        return await this._db.async_load_object_with_id(uuid, useCache) as T;
    }

    private async asyncLoadState(): Promise<object> {
        if (this._state == null) {
            let newState = await this.storage.get(STATE_ROOT) || {
                lastPersonUUID: null,
                loginToken: null,
            };

            runInAction(() => {
                this._state = newState;
            });
            this.logger.debug(`Loading state... ${JSON.stringify(this._state)}`);
        }
        return this.state;
    }

    private async asyncSaveState() {
        await this.storage.set(STATE_ROOT, this._state);
    }

    // protected waitForDB() {
    //     this.asyncLoadState().then(() => {
    //         this._db.readyEvent.subscribe(isReady => {
    //             if (isReady) {
    //                 this.readyEvent.next(true);
    //             }
    //         });
    //     });
    // }

    /*
    Basic idea is that you do a this, optionally a login/create, then ALWAYS call this back.
    This method is the one thing that does setup, in order.

    This method can be used to verify that a login token is valid.
    It will load the saved state, and:
      - if online, try to validate the login token / load the user.
        It is expected that if you have logged in in the past, the token is valid and
        the user should exist in the local DB (by uuid)
     */
    async asyncRunStartupLifecycle(callback: ILifecycleCallback, timeout: number = Infinity): Promise<boolean> {
        await this.asyncLoadState();

        // If the state is the same, do nothing. As nothing has changed.
        let areSet = isDefined(this._previousState) && isDefined(this._state);
        if (areSet) {
            if (ObjectUtils.deep_equal(this._previousState, this._state)) {
                this.logger.info('asyncRunStartupLifecycle', 'Ignored - the state hasnt changed');
                return;
            }
        } else {
            this.logger.warn(`One or the other of state isn't set. Running lifecycle.`);
        }


        if (!this.state.loginToken) {
            this.logger.debug('asyncRunStartupLifecycle', `Login token null, show login page`);
            callback.showLoginPage(`Login token null`);
            return false;
        }

        let vr = await this.validateLoginToken(this.state.loginToken);
        if (!vr.ok) {
            this.logger.debug('asyncRunStartupLifecycle', `Login token invalid, show login page`);
            callback.showLoginPage(`Login token invalid: ${SafeJSON.stringify(vr)}`);
            return false;
        }

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
        try {
            await this.setupDBFromState(timeout);
        } catch (err) {
            callback.showError(err);
            return false;
        }

        this._previousState = Object.assign({}, this._state);
        return true;
    }


    async registerNewUser(name: string, email: string, pwd: string): Promise<Person> {
        let lr = await this.restAPI.registerNewUser(name, email, pwd);
        if (lr.ok) {
            return Person.createFromUserRespose(lr.user);
        }
        return null;
    }

    setStore(store: RootStore) {
        this.store = store;
    }

    async setDatabase(dbInstance: SchedulerDatabase) {
        if (dbInstance != this._db) {
            if (this.db) {
                await this.db.asyncStopReplication();
            }
            this.logger.info(`Setting db ${dbInstance} on self and sending to store`);
            this._db = dbInstance;
            await this.store.setDatabase(dbInstance);
            this.dbSubject.next(this._db);
        }
    }

    private async setupDBFromState(responseTimeout: number = Infinity) {
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
        this.logger.info('setupDBFromState', `Clearing state...`);
        this.store.clearDependentState();

        // Wait until the DB is ready and set it on the rootstore
        this.logger.info('setupDBFromState', `Waiting for DB ready...`);
        let dbReadyResult = await newDb.readyEvent.pipe(
            take(1) // so that the BehaviorSubject returns us something
        ).toPromise();
        this.logger.info('setupDBFromState', `DB ready: ${dbReadyResult}`);

        // Set this DB on the RootStore
        await this.setDatabase(newDb);

        // load what we have (wait while this happens)
        this.logger.info('setupDBFromState', `Loading from DB...`);
        await this.store.loadDataFromStorage();

        // Start replication
        let couch = this.configurationService.getValue('server')['couch'];
        newDb.startReplicationFor(couch, organizationUUID);
        let person = await this.asyncWaitForDBToContainPerson(personUUID, newDb, responseTimeout);
        this.store.ui_store.setLoggedInPerson(person);
    }

    async asyncWaitForDBToContainPerson(personUUID, newDb, responseTimeout: number) {
        // Poll until we can find the person.
        this.logger.info('setupDBFromState', `Waiting for replication to come up and give us ${personUUID}`);

        if (responseTimeout == Infinity) {
            responseTimeout = 15000;
        }

        await Observable.timer(250, 500)
            .pipe(
                flatMap(() => {
                    this.logger.debug(`Seeing if person ${personUUID} exists...`);
                    return Observable.from(newDb.async_does_object_with_id_exist(personUUID));
                }),
                filter((v: boolean) => v),
                timeout(responseTimeout),
                take(1), // take the first successful, then terminate
                catchError(err => {
                    throw new Error(`E1334: didn't find person with ID ${personUUID} within ${responseTimeout / 1000}s))`)
                })
            ).toPromise();

        this.logger.debug('setupDBFromState', `Got it! Woot!`);

        // We want that 'defaults' one to be alive so it triggers when we first load the state
        // this.checkForDefaults();

        // Make sure store logged in person is set
        // Again, causing various subjects on RootStore to fire, getting new state & objects
        let person = await newDb.async_load_object_with_id(personUUID) as Person;
        if (!person) {
            throw new Error(`Cannot find person with UUID ${personUUID}, setupDBFromState failed`);
        }
        return person;
    }
}

export {
    SchedulerServer,
    IState,
    ILifecycle,
    ILifecycleCallback

}