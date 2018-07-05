import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {
    LoginResponse,
    OrganizationResponse, RoleSetResponse,
    ServerError,
    UserResponse,
    ValidationResponse
} from "../../common/interfaces";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import {Logger, LoggingService} from "ionic-logging-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import "rxjs/add/observable/from";

@Injectable()
export class RESTServer {
    logger: Logger;
    loginToken: string;

    constructor(public http: HttpClient,
                public loggingService: LoggingService,
                public config: ConfigurationService) {
        this.logger = this.loggingService.getLogger("service.rest");

        let server = this.config.getValue("server");
        if (!server['couch']) {
            throw new Error(`settings.json needs a server.couch entry (${SWBSafeJSON.stringify(server)})`);
        }
        if (!server['rest']) {
            throw new Error(`settings.json needs a server.rest entry (${SWBSafeJSON.stringify(server)})`);
        }
        this.logger.info(`Server - Couch: ${server['couch']}, REST: ${server['rest']}. `);
    }

    private server_url(path): string {
        let server = this.config.getValue("server");
        return `${server['rest']}/api/${path}`;
    }

    isUsernameAvailableAndGood(username: string): Observable<string> {
        let url = this.server_url("validate_login/" + `?email=${username}`);
        return this.http.get(url).map(r => {
            if ('in_use' in r) {
                return r['in_use'] == false ? "good" : "bad"
            }
            return "bad";
        });
    }


    async login(username: string, password: string): Promise<LoginResponse> {
        let url = this.server_url("login/" + `?email=${username}&password=${password}`);
        this.logger.info(`About to: ${url}`);
        return this.http.get(url).map(r => {
            // this.logger.warn(`RESP: ${SafeJSON.stringify(r)}`);
            return Object.assign(new LoginResponse(), r)
        }).toPromise();
    }

    async validateLoginToken(token: string): Promise<ValidationResponse> {
        let url = this.server_url(`validate_token/?token=${token}`);
        return await this.http.get(url).map(r => {
            return {
                ok: r['ok'],
                detail: r['detail'],
                user: r['user']
            };
        }).toPromise();
    }


    async hasEmailBeenConfirmed(email: string): Promise<boolean> {
        let url = this.server_url(`validate_login/?email=${email}&active=1`);
        let options = this.options;
        return await this.http.get(url, options).map((resp: object) => {
                if (resp['active']) {
                    return resp['active'];
                }
                console.warn(`hasEmailBeenConfirmed, for ${email} received ${SWBSafeJSON.stringify(resp)}`);
                return false;
            }
        ).toPromise();
    }

    get headers(): HttpHeaders {
        if (this.loginToken) {
            return new HttpHeaders({'Authorization': `Token ${this.loginToken}`});
        }
        return null;
    }

    get options() {
        let options = {};
        let headers = this.headers;
        if (headers) {
            options['headers'] = headers;
        }
        return options;
    }

    storeGoogleAccessCode(code: string): Observable<ValidationResponse> {
        let url = this.server_url("token/");
        this.logger.info(`Sending access token`);
        return this.http.post(url, {code: code}, this.options).map(r => {
            // If we get back a JSON with 'ok'. Otherwise expect 'detail' to contain the error.
            if (r.hasOwnProperty('ok') && r['ok']) {
                return new LoginResponse(true);
            }
            this.logger.info(`Token store returned: ${SWBSafeJSON.stringify(r)}`);
            return new LoginResponse(false, r['detail']);
        })
    }

    async saveUser(user: object): Promise<UserResponse> {
        if (!user['id'] && !user['uuid']) {
            throw new Error(`No ID/UUID specified in the user object, ${JSON.stringify(user)}`);
        }
        let url = this.server_url(`user/${user['id'] || user['uuid']}/`);
        this.logger.info(`Updating user on server with: ${JSON.stringify(user)}`);
        return Object.assign(new UserResponse(), await this.http.patch(url, user, this.options).toPromise());
    }

    async updateOrganization(org: OrganizationResponse): Promise<OrganizationResponse> {
        if (!org.id && !org.uuid) {
            throw new Error(`No ID or UUID specified in the organization object, ${JSON.stringify(org)}`);
        }
        let url = this.server_url(`organization/${org.id || org.uuid}/`);
        this.logger.info(`Updating organization on server with: ${JSON.stringify(org)}`);
        return Object.assign(new OrganizationResponse(), await this.http.patch(url, org, this.options).toPromise());
    }

    async createOrganization(user: UserResponse): Promise<OrganizationResponse> {
        let url = this.server_url("organization/");
        let org: OrganizationResponse = {name: `Organization for ${user.email}`};
        let options = this.options;
        this.logger.info(`Creating new organization, ${JSON.stringify(org)}`);
        return await this.http.post(url, org, options).toPromise() as OrganizationResponse;
    }

    async getOrganization(organization_id: number): Promise<OrganizationResponse> {
        let url = this.server_url(`organization/${organization_id}/`);
        let options = this.options;
        this.logger.debug(`Getting organization, ${organization_id}`);
        return await this.http.get(url, options).toPromise() as OrganizationResponse;
    }

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
        let url = this.server_url(`login/`);
        let options = this.options;
        let body = {
            password: pwd,
            email: email,
        };
        body = Object.assign(body, this.fullNameToFirstAndLast(name));
        try {
            return await this.http.post(url, body, options).toPromise() as LoginResponse;
        } catch (err) {
            console.error(`Got bad response from server: ${JSON.stringify(err)}`);
            if (err['status']) {
                if (err['status'] == 400) {
                    throw new ServerError(err);
                }
            }
            throw err;
        }
    }

    async getRoleSets(): Promise<Array<RoleSetResponse>> {
        let url = this.server_url(`role_set/`);
        let options = this.options;
        try {
            return await this.http.get(url, options).toPromise() as RoleSetResponse[];
        } catch (err) {
            console.error(`Got bad response from server: ${JSON.stringify(err)}`);
            if (err['status']) {
                if (err['status'] == 400) {
                    throw new ServerError(err);
                }
            }
            throw err;
        }
    }
}
