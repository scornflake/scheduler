import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {LoginResponse, OrganizationResponse, UserResponse, ValidationResponse} from "../../common/interfaces";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import {Logger, LoggingService} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";
import "rxjs/add/observable/from";

@Injectable()
export class RESTServer {
    logger: Logger;
    loginToken: string;

    constructor(public http: HttpClient,
                public loggingService: LoggingService,
                public config: ConfigurationService) {
        this.logger = this.loggingService.getLogger("service.rest")
    }

    private server_url(path): string {
        let server = this.config.getValue("server");
        return `${server['url']}/api/${path}`;
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
        return this.http.get(url).map(r => {
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

    // // I wonder, can the client use the servers google token to talk to it?
    // // Unlikely?
    // get_sheets() {
    //     this.logger.info("Listing all sheets");
    //     let sheets_only = {
    //         q: "mimeType='application/vnd.google-apps.spreadsheet'"
    //     };
    //     return Observable.create((observable) => {
    //         let url = this.server_url("/sheets/");
    //         gapi.client.drive.files.list(sheets_only).then((response) => {
    //             let files = response.result.files;
    //             // for(let file of files) {
    //             // this.logger.info("got: " + SafeJSON.Stringify(file));
    //             observable.next(files);
    //             // }
    //             observable.complete();
    //         });
    //     });
    //
    // }

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
            this.logger.info(`Token store returned: ${SafeJSON.stringify(r)}`);
            return new LoginResponse(false, r['detail']);
        })
    }

    async saveUser(user: object): Promise<UserResponse> {
        if (!user['id']) {
            throw new Error(`No ID specified in the user object, ${JSON.stringify(user)}`);
        }
        let url = this.server_url(`user/${user['id']}/`);
        this.logger.info(`Updating user on server with: ${JSON.stringify(user)}`);
        return Object.assign(new UserResponse(), await this.http.patch(url, user, this.options).toPromise());
    }

    async updateOrganization(org: OrganizationResponse): Promise<OrganizationResponse> {
        if (!org.id) {
            throw new Error(`No ID specified in the organization object, ${JSON.stringify(org)}`);
        }
        let url = this.server_url(`organization/${org.id}/`);
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

}
