import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Logger, LoggingService} from "ionic-logging-service";
import {isUndefined} from "util";

@Injectable()
export class EndpointsProvider {
    logger: Logger;

    constructor(public config: ConfigurationService, public logService: LoggingService) {
        this.logger = this.logService.getLogger('service.endpoints');
    }

    async validateConfiguration(): Promise<any> {
        if (this.config == null || isUndefined(this.config)) {
            throw new Error(`We've been provided a null ConfigurationService!`);
        }

        let server = this.config.getValue("server");
        if (!server) {
            throw new Error('No "server" entry in the configuration');
        }
        if (!server['couch']) {
            throw new Error(`settings.json needs a server.couch entry (${SWBSafeJSON.stringify(server)})`);
        }
        if (!server['rest']) {
            throw new Error(`settings.json needs a server.rest entry (${SWBSafeJSON.stringify(server)})`);
        }
        this.logger.info(`Server - Couch: ${server['couch']}, REST: ${server['rest']}.`);
    }

    api_url(path): string {
        let server = this.config.getValue("server");
        return `${server['rest']}/api/${path}`;
    }

    general_url(path): string {
        let server = this.config.getValue("server");
        return `${server['rest']}/${path}`;
    }

    couch_url(path): string {
        let server = this.config.getValue("server");
        return `${server['couch']}/${path}`;
    }


    // noinspection JSMethodCanBeStatic
    // httpHeaders(token: string | null): HttpHeaders | null {
    //     if (token) {
    //         return new HttpHeaders({'Authorization': `Bearer ${token}`});
    //     }
    //     return null;
    // }

    // httpOptions(token: string | null) {
    //     let options = {};
    //     let headers = this.httpHeaders(token);
    //     if (headers) {
    //         options['headers'] = headers;
    //     }
    //     return options;
    // }

    validateLogin(username: string, active: boolean = false, wasResetEmail: boolean = false) {
        let url = this.api_url("validate_login/" + `?email=${username.toLowerCase()}`);
        if (active) {
            url = `${url}&active=1`;
        }
        if(wasResetEmail) {
            url = `${url}&check_reset=1`
        }
        return url;
    }

    validateToken(token: string) {
        return this.api_url("validate_token/" + `?token=${token}`);
    }

    login(username: string, password: string) {
        return this.api_url("login/" + `?email=${username.toLowerCase()}&password=${password}`);
    }

    registerNewUser() {
        return this.api_url("login/");
    }

    moveUserToNewOrg() {
        return this.api_url("move/");
    }

    invite() {
        return this.api_url("invite/");
    }

    roleSets() {
        return this.api_url("role_set/");
    }

    userDetails() {
        return this.api_url("user/");
    }

    refreshToken() {
        return this.general_url("api-token-refresh/")
    }

    forgotPassword() {
        return this.api_url("forgot/")
    }

    forgotPasswordPage() {
        return this.general_url("password_reset/")
    }
}
