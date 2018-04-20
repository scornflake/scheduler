import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {LoginResponse, ValidationResponse} from "../../common/interfaces";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import {RootStore} from "../../state/root";

@Injectable()
export class ServerProvider {

    constructor(public http: HttpClient,
                public store: RootStore,
                public config: ConfigurationService) {
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


    loginUser(username: string, password: string): Observable<ValidationResponse> {
        let url = this.server_url("login/" + `?email=${username}&password=${password}`);
        return this.http.get(url).map(r => {
            let res = Object.assign(new LoginResponse(), r);
            if (res.ok) {
                if (res['token'])
                    this.store.ui_store.saved_state.login_token = res['token'];
            }
            return res;
        });
    }

    validateLoginToken(): Observable<ValidationResponse> {
        let token = this.store.ui_store.saved_state.login_token;
        console.log(`Validating login token: ${JSON.stringify(token)}`);
        let url = this.server_url("validate_token/?token=" + token);
        return this.http.get(url).map(r => {
            let vr: ValidationResponse = {
                ok: r['ok'],
                reason: r['reason'],
                user: r['user']
            };
            this.store.ui_store.login_token_validated = vr.ok;
            return vr;
        })
    }
}
