import {RootStore} from "../../store/root";
import {RESTServer} from "./server";
import {LoginResponse, UserResponse, ValidationResponse} from "../../common/interfaces";
import {SafeJSON} from "../../common/json/safe-stringify";
import {isUndefined} from "util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Person} from "../../scheduling/people";
import {Observable} from "rxjs/Observable";
import {Injectable} from "@angular/core";
import {Organization} from "../../scheduling/organization";
import {SchedulerDatabase} from "./db";

@Injectable()
class SchedulerServer {
    private logger: Logger;

    constructor(public store: RootStore, public restAPI: RESTServer, public db: SchedulerDatabase) {
        this.logger = LoggingWrapper.getLogger('service.bridge');
    }

    isUsernameAvailableAndGood(username: string): Observable<string> {
        return this.restAPI.isUsernameAvailableAndGood(username);
    }

    async loginUser(username: string, password: string): Promise<LoginResponse> {
        let res: LoginResponse = await this.restAPI.login(username, password);

        let uiStore = this.store.ui_store;
        if (res.ok) {
            let savedState = uiStore.saved_state;

            let user = res.user;
            this.logger.info(`Login: setting login token to ${user.logintoken}`);
            uiStore.login_token_validated = true;
            savedState.login_token = user.logintoken;
            this.restAPI.loginToken = user.logintoken;

            // Make sure user is synced with server. Return all known user info.
            return new LoginResponse(true, "", await this.syncUserWithServer(res.user));
        } else {
            this.logger.error(`Login was not OK. ${JSON.stringify(res)}`);
            this.logger.info(`Login: Clearing logger in person UUID`);
            uiStore.saved_state.logged_in_person_uuid = null;
        }
        return res;
    }

    async validateLoginToken(): Promise<ValidationResponse> {
        // If no 'person uuid', need to login
        let savedState = this.store.ui_store.saved_state;
        if (!savedState.logged_in_person_uuid) {
            return new LoginResponse(false, 'No person uuid is defined');
        }
        let token = savedState.login_token;
        if (isUndefined(token)) {
            return new LoginResponse(false, 'No person is defined');
        }
        this.logger.info(`Validating login token: ${SafeJSON.stringify(token)}`);

        let vr = await this.restAPI.validateLoginToken(savedState.login_token);
        this.store.ui_store.login_token_validated = vr.ok;
        this.restAPI.loginToken = savedState.login_token;
        return vr;
    }

    async syncUserWithServer(serverUser: UserResponse): Promise<UserResponse> {
        let localPerson: Person;
        let munge = false;
        if (!serverUser.uuid) {
            // No UUID set. Assume this is the "munge" scenario.
            // This in theory only happens when I'm testing myself, and have created manual fields on the server
            localPerson = this.store.people.findByEmail(serverUser.email);
            this.logger.warn(`MUNGE: Going to create a local user in Pouch with ${serverUser.email}`);
            if (localPerson == null) {
                localPerson = this.createNewPersonFromUserResponse(serverUser);
            } else {
                if (localPerson.serverId != serverUser.id) {
                    this.logger.info(`Updating local person ${localPerson.email} to have server user ID: ${serverUser.id}`);
                    localPerson.serverId = serverUser.id;
                }
            }

            // Update our local pouch store
            this.logger.warn(`MUNGE: Created new local Person ${localPerson}`);

            // Update the remote server (with the new users uuid)
            if (serverUser.uuid != localPerson.uuid) {
                serverUser.uuid = localPerson.uuid;
                await this.restAPI.saveUser(serverUser);
                this.logger.warn(`MUNGE Done. Falling through to rest of init.`);
            }
            munge = true;
        } else {
            // The user supplied an ID. Does that user exist here?
            localPerson = this.store.people.findOfThisTypeByUUID(serverUser.uuid);
            if (!localPerson) {
                // This can happen, when I've deleted the local DB, but NOT the remote. So remote still references UUIDs that no longer exist,
                this.logger.warn(`Server says this user has ID ${serverUser.uuid} but no such user exists in the local DB`);
                localPerson = this.createNewPersonFromUserResponse(serverUser);
                munge = true;
            }
        }

        await this.savePerson(localPerson);
        await this.ensureUserHasOrganization(serverUser, localPerson, munge);

        this.store.ui_store.saved_state.logged_in_person_uuid = localPerson.uuid;

        // This will setup the loggedInUser, organization, etc. Required for use of the app.
        this.store.setInitialState();

        return serverUser;
    }

    private createNewPersonFromUserResponse(serverUser: UserResponse) {
        let person = new Person("Your name", serverUser.uuid);
        person.email = serverUser.email;
        person.name = [serverUser.first_name, serverUser.last_name].join(" ").trim();
        person.serverId = serverUser.id;
        this.store.people.add(person);
        return person;
    }

    /*
        Organizations 'source of truth' is the server. So queries START there.

        An alternate way to do all this might be for the server to do it, and rely on replication
        to bring the correct data to the client.  The client makes a single request and waits until the data
        shows up.

        */
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
            let org = await this.db.async_load_object_with_id(orgResponse.uuid) as Organization;
            if (!org) {
                let message = `No organization exists with UUID: ${orgResponse.uuid}`;
                if(munge) {
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
}

export {
    SchedulerServer
}