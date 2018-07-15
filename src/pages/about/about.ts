import {Component} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import * as moment from "moment";
import {HttpClient} from "@angular/common/http";

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

    constructor(public navCtrl: NavController, public http: HttpClient) {

    }

    ngOnInit() {
        this.http.get("/assets/version.json").subscribe(r => {
            this.version = r['version'];
            this.build = r['build'];
        })
    }

    get year(): number {
        return moment().year();
    }
}
