import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Availability} from "../../scheduling/availability";

@IonicPage()
@Component({
    selector: 'page-availability-options',
    templateUrl: 'availability-options.html',
})
export class AvailabilityOptionsPage {
    availability: Availability;

    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.availability = this.navParams.get('availability');
    }

    ionViewDidLoad() {
    }

}
