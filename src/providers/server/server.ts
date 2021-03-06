import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {InviteResponse, LoginResponse, RoleSetResponse, ServerError, ValidationResponse} from "../../common/interfaces";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import {Logger, LoggingService} from "ionic-logging-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import "rxjs/add/observable/from";
import {Person} from "../../scheduling/people";
import {EndpointsProvider} from "../endpoints/endpoints";
import {StateProvider} from "../state/state";

@Injectable()
export class RESTServer {
    logger: Logger;

    constructor(public http: HttpClient,
                public endpoints: EndpointsProvider,
                public state: StateProvider,
                public loggingService: LoggingService,
                public config: ConfigurationService) {
        this.logger = this.loggingService.getLogger("service.rest");
    }

    isUsernameAvailableAndGood(username: string): Observable<string> {
        // doesn't need a token
        let url = this.endpoints.validateLogin(username);
        return this.http.get(url).map(r => {
            if ('in_use' in r) {
                return r['in_use'] == false ? "good" : "bad"
            }
            return "bad";
        });
    }


    // async login(username: string, password: string): Promise<LoginResponse> {
    //     // doesn't need a token, but produces one :)
    //     let url = this.endpoints.login(username, password);
    //
    //     this.logger.info(`About to: ${url}`);
    //     return this.http.get(url).map(r => {
    //         // this.logger.warn(`RESP: ${SafeJSON.stringify(r)}`);
    //         return Object.assign(new LoginResponse(), r)
    //     }).toPromise();
    // }
    //
    // async validateLoginToken(token: string): Promise<ValidationResponse> {
    //     let url = this.endpoints.validateToken(token);
    //     return await this.http.get(url).map(r => {
    //         return {
    //             ok: r['ok'],
    //             detail: r['detail'],
    //             user: r['user']
    //         };
    //     }).toPromise();
    // }

    async getOwnUserDetails(): Promise<any> {
        try {
            let url = this.endpoints.userDetails();
            let getObservable = this.http.get(url);
            return getObservable.toPromise();
        } catch (err) {
            this.logger.error("getOwnUserDetails", `Cant get user. Throwing ${SWBSafeJSON.stringify(err)}).`);
            throw new ServerError(err);
        }
    }

    async hasEmailBeenConfirmed(email: string, wasAResetEmail: boolean): Promise<boolean> {
        let url = this.endpoints.validateLogin(email, true, wasAResetEmail);
        return await this.http.get(url).map((resp: object) => {
                this.logger.warn("hasEmailBeenConfirmed", `${email} received ${SWBSafeJSON.stringify(resp)}`);
                if (resp.hasOwnProperty("reset_email_confirmed")) {
                    this.logger.warn(`Using reset_email_confirmed`);
                    return resp['reset_email_confirmed'];
                }
                if (resp.hasOwnProperty("active")) {
                    this.logger.warn(`Using active`);
                    return resp['active'];
                }
                return false;
            }
        ).toPromise();
    }

    storeGoogleAccessCode(code: string): Observable<ValidationResponse> {
        throw Error("not implemented");
        // let url = this.server_url("token/");
        // this.logger.info(`Sending access token`);
        // return this.http.post(url, {code: code}, this.options).map(r => {
        //     // If we get back a JSON with 'ok'. Otherwise expect 'detail' to contain the error.
        //     if (r.hasOwnProperty('ok') && r['ok']) {
        //         return new LoginResponse(true);
        //     }
        //     this.logger.info(`Token store returned: ${SWBSafeJSON.stringify(r)}`);
        //     return new LoginResponse(false, r['detail']);
        // })
    }

    // async saveUser(user: object): Promise<UserResponse> {
    //     if (!user['id'] && !user['uuid']) {
    //         throw new Error(`No ID/UUID specified in the user object, ${JSON.stringify(user)}`);
    //     }
    //     let url = this.server_url(`user/${user['id'] || user['uuid']}/`);
    //     this.logger.info(`Updating user on server with: ${JSON.stringify(user)}`);
    //     return Object.assign(new UserResponse(), await this.http.patch(url, user, this.options).toPromise());
    // }

    // async updateOrganization(org: OrganizationResponse): Promise<OrganizationResponse> {
    //     if (!org.id && !org.uuid) {
    //         throw new Error(`No ID or UUID specified in the organization object, ${JSON.stringify(org)}`);
    //     }
    //     let url = this.server_url(`organization/${org.id || org.uuid}/`);
    //     this.logger.info(`Updating organization on server with: ${JSON.stringify(org)}`);
    //     return Object.assign(new OrganizationResponse(), await this.http.patch(url, org, this.options).toPromise());
    // }

    // async createOrganization(user: UserResponse): Promise<OrganizationResponse> {
    //     let url = this.server_url("organization/");
    //     let org: OrganizationResponse = {name: `Organization for ${user.email}`};
    //     let options = this.options;
    //     this.logger.info(`Creating new organization, ${JSON.stringify(org)}`);
    //     return await this.http.post(url, org, options).toPromise() as OrganizationResponse;
    // }

    // async getOrganization(organization_id: number): Promise<OrganizationResponse> {
    //     let url = this.server_url(`organization/${organization_id}/`);
    //     let options = this.options;
    //     this.logger.debug(`Getting organization, ${organization_id}`);
    //     return await this.http.get(url, options).toPromise() as OrganizationResponse;
    // }

    // noinspection JSMethodCanBeStatic
    fullNameToFirstAndLast(fullName): { first_name: string, last_name: string } {
        let response = {
            first_name: "",
            last_name: ""
        };
        let name_parts = fullName.split(' ');
        if (name_parts.length > 0) {
            response.first_name = name_parts[0];
            name_parts.splice(0, 1);

            if (name_parts.length > 0) {
                response.last_name = name_parts.join(' ')
            }
        }
        return response;
    }

    async registerNewUser(name: string, email: string, pwd: string): Promise<LoginResponse> {
        if (!name || !email || !pwd) {
            throw new Error('name, email and pwd are required');
        }
        let url = this.endpoints.registerNewUser();
        let body = {
            password: pwd,
            email: email,
        };
        body = Object.assign(body, this.fullNameToFirstAndLast(name));
        try {
            return await this.http.post(url, body).toPromise() as LoginResponse;
        } catch (err) {
            console.error(`Got bad response from server: ${JSON.stringify(err)}`);
            throw new ServerError(err);
        }
    }

    async getRoleSets(): Promise<Array<RoleSetResponse>> {
        let url = this.endpoints.roleSets();
        try {
            return await this.http.get(url).toPromise() as RoleSetResponse[];
        } catch (err) {
            console.error(`Got bad response from server for getRoleSets: ${JSON.stringify(err)}`);
            throw new ServerError(err);
        }
    }

    async sendInvites(toPeople: Person[]): Promise<InviteResponse[]> {
        // We do a number of puts. Can we do an array of. Yes.
        // This has to be an authenticated request. You don't need to specify 'from_user', that'll come from the auth token.
        let url = this.endpoints.invite();
        let body = toPeople.map(p => {
            return {'to_email': p.email}
        });
        try {
            return await this.http.post(url, body).toPromise() as InviteResponse[];
        } catch (err) {
            console.error(`Got bad response from server for sendInvites: ${JSON.stringify(err)}`);
            throw new ServerError(err);
        }
    }

    async movePersonToOrganization(person: Person, targetOrganizationUUID: string) {
        let moveCommand = {
            "email": person.email,
            "from_organization_uuid": person.organization.uuid,
            "to_organization_uuid": targetOrganizationUUID,
        };
        try {
            let url = this.endpoints.moveUserToNewOrg();
            return await this.http.post(url, moveCommand).toPromise();
        } catch (e) {
            throw new ServerError(e);
        }
    }

    async forgotPassword(registrationEmail: string) {
        let forgotCommand = {
            email: registrationEmail
        };
        try {
            let url = this.endpoints.forgotPassword();
            return await this.http.post(url, forgotCommand).toPromise();
        } catch (e) {
            throw new ServerError(e);
        }
    }

    changePassword(registrationEmail: string, newPassword: string) {

    }
}