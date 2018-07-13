import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {ObjectValidation} from "../../scheduling/shared";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";

@IonicPage()
@Component({
    selector: 'page-try-to-schedule-with-other',
    templateUrl: 'try-to-schedule-with-other.html',
})
export class TryToScheduleWithOtherPage {
    person_uuid: string;
    distance: number = 1;
    max: number = 2;
    people: Array<Person>;
    private callback: (person, distance, max) => void;

    constructor(public navCtrl: NavController,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.callback = this.navParams.get('callback');
        if (!this.callback) {
            this.callback = (p, d, m) => {
            }
        }
        this.people = NamedObject.sortByName(this.navParams.get('people'));
    }

    dismiss() {
        this.navCtrl.pop();
    }

    save() {
        if (!this.person_uuid) {
            this.pageUtils.showValidationError(ObjectValidation.simple("Person is required"));
            return;
        }

        let person = this.people.find(p => p.uuid == this.person_uuid);
        this.callback(person, this.distance, this.max);
        this.navCtrl.pop();
    }

}
