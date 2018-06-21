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
import {action} from "mobx-angular";
import {Storage} from '@ionic/storage';
import {NavController} from "ionic-angular";

const STATE_ROOT = 'state';

interface IState {
    loginToken: string;
    lastPersonUUID: string;
}

interface ILifecycleCallback {
    showLoginPage();

    showCreateOrInvitePage();

    showError(message: string);
}

interface ILifecycle {
    asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean>;
}


@Injectable()
class SchedulerServer implements ILifecycle {
    readyEvent: Subject<boolean> = new BehaviorSubject(false);

    private logger: Logger;
    private _state: IState;

    constructor(@Inject(forwardRef(() => RootStore)) private store,
                private restAPI: RESTServer,
                private storage: Storage,
                private db: SchedulerDatabase) {
        this.logger = LoggingWrapper.getLogger('service.bridge');
        this.waitForDB();
    }

    isUsernameAvailableAndGood(username: string): Observable<string> {
        return this.restAPI.isUsernameAvailableAndGood(username);
    }

    get state(): IState {
        return this._state;
    }

    async loginUser(username: string, password: string): Promise<LoginResponse> {
        this.logger.info(`Requesting user info from server: ${username}`);
        await this.asyncLoadState();
        let res: LoginResponse = await this.restAPI.login(username, password);
        this.setLoginTokenFromUserResponse(res.ok, res.user || null);

        if (res.ok) {
            let person = await this.db_findByUUID(res.user.uuid);
            if (!person) {
                person = this.createNewPersonFromUserResponse(res.user);
                await this.db.async_store_or_update_object(person);
            }
        }

        await this.asyncSaveState();
        return res;
    }

    @action logout() {
        this.state.lastPersonUUID = null;
        this.state.loginToken = null;
        this.asyncSaveState().then(() => {
            this.logger.info(`User logged out, state saved.`);
        });
    }

    setLoginTokenFromUserResponse(good: boolean, user: UserResponse = null) {
        let uiStore = this.store.ui_store;

        if (good) {
            this.logger.info(`Login: setting login token to ${user.logintoken || ''}, last person to: ${user.uuid || ''}`);
            this.restAPI.loginToken = user.logintoken;
            this.state.loginToken = user.logintoken;
            this.state.lastPersonUUID = user.uuid;
        } else {
            this.restAPI.loginToken = null;
            this.logger.info(`Login: Clearing logger in person UUID (because login not OK)`);
        }
        uiStore.setLoginTokenValidated(good);
    }

    @action
    async validateLoginToken(token: string): Promise<ValidationResponse> {
        // If no 'person uuid', need to login
        this.logger.info(`Validating login token: ${SafeJSON.stringify(token)}`);

        let vr = await this.restAPI.validateLoginToken(token);

        this.setLoginTokenFromUserResponse(vr.ok, vr.user);

        return vr;
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

    private createNewPersonFromUserResponse(serverUser: UserResponse): Person {
        let person = new Person("Your name", serverUser.uuid);
        person.email = serverUser.email;
        person.name = [serverUser.first_name, serverUser.last_name].join(" ").trim();
        person.serverId = serverUser.id;
        this.store.people.add(person);
        return person;
    }

    @action
    private async ensureUserHasOrganization(user: UserResponse, localPerson: Person, munge: boolean): Promise<Organization> {
        // Is there an org associated with us on the server?
        if (!user.organization_id) {
            this.logger.info(`This user doesn't have an organization on the server. Creating one.`);
            let orgResponse = await this.restAPI.createOrganization(user);

            // Link to the user, on the server
            user.organization_id = orgResponse.id;
            let userSaveResp = await this.restAPI.saveUser(user);
            this.logger.info(`User resp after saving with org: ${JSON.stringify(userSaveResp)}`);

            // Create this here in Pouch.
            let org = await this.createNewOrganizationInPouch(orgResponse.name);

            // Now we have it's UUID, save that on the servers copy
            orgResponse.uuid = org.uuid;
            await this.restAPI.updateOrganization(orgResponse);

            // Make sure our local user is pointing to this pouch org.
            localPerson.organization = org;
            await this.store.asyncSaveOrUpdateDb(localPerson);

            return org;
        } else {
            // They have an org on the server. Get it.
            this.logger.info(`User has organization ID: ${user.organization_id}`);
            let orgResponse = await this.restAPI.getOrganization(user.organization_id);

            // Wait! the org on the server isn't tied to an org in pouch.
            if (!orgResponse.uuid) {
                this.logger.info(`Got organization ${user.organization_id} but it has no UUID! Going to create a new pouch org and assign it`);
                let pouchOrg = await this.createNewOrganizationInPouch(orgResponse.name);
                orgResponse.uuid = pouchOrg.uuid;
                await this.restAPI.updateOrganization(orgResponse);
            }

            // Find the org in pouch
            let org = await this.db_findByUUID(orgResponse.uuid) as Organization;
            if (!org) {
                let message = `No organization exists with UUID: ${orgResponse.uuid}`;
                if (munge) {
                    this.logger.warn(message + " ... creating it (part of MUNGE).");
                    org = new Organization(`Munged org for ${user.email}`);
                    org._id = orgResponse.uuid;
                    await this.saveOrganization(org);
                } else {
                    throw new Error(message);
                }
            }

            // Make sure the user points at this org.
            if (!localPerson.organization) {
                this.logger.info(`Logged in person has no organization. Assigning: ${org.name}`);
                localPerson.organization = org;
            } else {
                if (localPerson.organization.uuid != org.uuid) {
                    this.logger.info(`Logged in person has association to wrong org. Assigning to ${org.name}`);
                    localPerson.organization = org;
                }
            }
            this.logger.info(`Person ${localPerson} with org: ${org}`);
            return org as Organization;
        }
    }

    private async createNewOrganizationInPouch(name: string): Promise<Organization> {
        // Create this here in Pouch.
        let org = new Organization(name);
        return await this.db.async_store_or_update_object(org) as Organization;
    }

    async saveOrganization(organization: Organization): Promise<Organization> {
        return await this.db.async_store_or_update_object(organization) as Organization;
    }

    async savePerson(person: Person): Promise<Person> {
        return await this.db.async_store_or_update_object(person) as Person;
    }

    async db_findPersonByEmail(email: string): Promise<Person> {
        let query = {selector: {type: 'Person', email: email}};
        let all_objects_of_type = await this.db.findBySelector<Person>(query, true);
        if (all_objects_of_type && all_objects_of_type.length > 0) {
            return all_objects_of_type[0];
        }
        return null;
    }

    async db_findByUUID<T extends ObjectWithUUID>(uuid: string): Promise<T> {
        return await this.db.async_load_object_with_id(uuid) as T;
    }

    private async asyncLoadState(): Promise<object> {
        this._state = await this.storage.get(STATE_ROOT) || {
            lastPersonUUID: null,
            loginToken: null,
        };
        this.logger.debug(`Loading state... ${JSON.stringify(this._state)}`);
        return this.state;
    }

    private async asyncSaveState() {
        await this.storage.set(STATE_ROOT, this._state);
    }

    protected waitForDB() {
        this.asyncLoadState().then(() => {
            this.db.readyEvent.subscribe(isReady => {
                if (isReady) {
                    this.readyEvent.next(true);
                }
            });
        });
    }

    /*
    Basic idea is that you do a this, optionally a login/create, then ALWAYS call this back.
    This method is the one thing that does setup, in order.

    This method can be used to verify that a login token is valid.
    It will load the saved state, and:
      - if online, try to validate the login token / load the user.
        It is expected that if you have logged in in the past, the token is valid and
        the user should exist in the local DB (by uuid)
     */
    async asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean> {
        await this.asyncLoadState();

        if (!this.state.loginToken) {
            this.logger.debug(`Login token null, show login page`);
            callback.showLoginPage();
            return false;
        }

        let vr = await this.validateLoginToken(this.state.loginToken);
        if (!vr.ok) {
            this.logger.debug(`Login token in valid, show login page`);
            callback.showLoginPage();
            return false;
        }

        // If no person UUID, loginUser() didn't do its job.
        // Login should validate token, check for Person object locally (direct DB access)
        // and also set this.state.lastPersonUUID.
        if (!this.state.lastPersonUUID) {
            this.logger.debug(`lastPersonUUID nil, show login page`);
            callback.showLoginPage();
            return false;
        }

        this.logger.debug(`Looking up user with ID: ${this.state.lastPersonUUID}`);
        let personObject = await this.db_findByUUID(this.state.lastPersonUUID);
        if (personObject == null) {
            callback.showError("E1334: Please try logging in again.");
            return false;
        }

        // Place the logged in user (person) into UI State.
        this.store.ui_store.setLoggedInPerson(personObject);

        // Make the Organization available as well
        // Buuut - the org is ON Person. Ref it from there.
        // Don't stick anything here, find if it's broken and fix it in right place

        // OK. We have everything. Can now ask the store to load it's data, and we're good.
        await this.store.setupAfterUserLoggedIn();

        return true;
    }
}

export {
    SchedulerServer,
    IState,
    ILifecycle,
    ILifecycleCallback

}