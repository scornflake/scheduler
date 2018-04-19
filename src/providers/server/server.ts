import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationService} from "ionic-configuration-service";
import {LoginResponse, ValidationResponse} from "../../common/interfaces";
import {Observable} from "rxjs/Observable";
import "rxjs/add/operator/map";
import {RootStore} from "../../state/root";
import {Person} from "../../state/people";

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
            // console.log(`Got: ${JSON.stringify(r)}`);
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
            if(res.ok) {
                // this.store.ui_store.l
            }
            return res;
        });
    }
}
