import {Component} from '@angular/core';
import {IonicPage, NavController, Platform} from 'ionic-angular';
import * as moment from "moment";
import {HttpClient} from "@angular/common/http";
import {EndpointsProvider} from "../../providers/endpoints/endpoints";

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

    constructor(public navCtrl: NavController,
                public platform: Platform,
                public endpoints: EndpointsProvider,
                public http: HttpClient) {
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

    get developer(): boolean {
        return this.environment == 'default';
    }

    get rest_url(): string {
        return this.endpoints.api_url("");
    }

    get couch_url(): string {
        return this.endpoints.couch_url("");
    }
}
