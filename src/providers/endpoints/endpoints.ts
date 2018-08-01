import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Logger} from "ionic-logging-service";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {HttpHeaders} from "@angular/common/http";
import {isUndefined} from "util";

@Injectable()
export class EndpointsProvider {
    logger: Logger;

    constructor(public config: ConfigurationService) {
        if (config == null || isUndefined(config)) {
            throw new Error(`We've been provided a null ConfigurationService!`);
        }

        let server = config.getValue("server");
        if (!server['couch']) {
            throw new Error(`settings.json needs a server.couch entry (${SWBSafeJSON.stringify(server)})`);
        }
        if (!server['rest']) {
            throw new Error(`settings.json needs a server.rest entry (${SWBSafeJSON.stringify(server)})`);
        }
        this.logger = LoggingWrapper.getLogger('service.endpoints');
        this.logger.info(`Server - Couch: ${server['couch']}, REST: ${server['rest']}.`);
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

    validateLogin(username: string, active: boolean = false) {
        let url = this.server_url("validate_login/" + `?email=${username.toLowerCase()}`);
        if (active) {
            url = `${url}&active=1`;
        }
        return url;
    }

    validateToken(token: string) {
        return this.server_url("validate_token/" + `?token=${token}`);
    }

    login(username: string, password: string) {
        return this.server_url("login/" + `?email=${username.toLowerCase()}&password=${password}`);
    }

    registerNewUser() {
        return this.server_url("login/");
    }

    moveUserToNewOrg() {
        return this.server_url("move/");
    }

    invite() {
        return this.server_url("invite/");
    }

    roleSets() {
        return this.server_url("role_set/");
    }

    server_url(path): string {
        let server = this.config.getValue("server");
        return `${server['rest']}/api/${path}`;
    }

    refreshToken() {
        return this.server_url("api-token-refresh/")
    }

    userDetails() {
        return this.server_url("api/user/");
    }
}
