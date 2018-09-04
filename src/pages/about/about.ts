import {Component} from '@angular/core';
import {IonicPage, NavController, Platform} from 'ionic-angular';
import * as moment from "moment";
import {HttpClient} from "@angular/common/http";
import {EndpointsProvider} from "../../providers/endpoints/endpoints";
import {ConfigurationService} from "ionic-configuration-service";
import {StateProvider} from "../../providers/state/state";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {AuthorizationService} from "../../providers/token/authorization.service";
import {Logger, LoggingService} from "ionic-logging-service";

@IonicPage({
    name: 'page-about',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-about',
    templateUrl: 'about.html'
})
export class AboutPage {
    version: string;
    build: string;
    environment: string;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public platform: Platform,
                public config: ConfigurationService,
                private logService: LoggingService,
                public state: StateProvider,
                private auth: AuthorizationService,
                public endpoints: EndpointsProvider,
                public http: HttpClient) {

        this.logger = this.logService.getLogger('page.about');
    }

    ngOnInit() {
        this.http.get("/assets/version.json").subscribe(r => {
            this.version = r['version'];
            this.build = r['build'];
            this.environment = r['environment'];
        })
    }

    // noinspection JSMethodCanBeStatic
    get year(): number {
        return moment().year();
    }

    get name(): string {
        try {
            return this.config.getValue('name');
        } catch (err) {
            return "Unknown";
        }
    }

    get development(): boolean {
        return this.name === 'development';
    }

    get roles(): string {
        let roles = [];
        let decodedToken = this.state.state.decodedToken;
        if (decodedToken) {
            let userRoles = decodedToken['roles'];
            if (userRoles) {
                roles = roles.concat(userRoles.map(r => {
                    let indexOf_ = r.indexOf('_');
                    if (indexOf_ != -1) {
                        return r.slice(0, indexOf_);
                    }
                    return r;
                }))
            }
        }
        return roles.join(", ");
    }

    refreshToken() {
        this.auth.refresh().subscribe(r => {
            this.logger.info(`Refreshed: ${SWBSafeJSON.stringify(r)}`);
        });
    }

    get rest_url(): string {
        return this.endpoints.api_url("");
    }

    get couch_url(): string {
        return this.endpoints.couch_url("");
    }
}
