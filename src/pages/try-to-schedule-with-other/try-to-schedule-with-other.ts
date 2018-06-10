import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {ObjectValidation} from "../../scheduling/shared";
import {PageUtils} from "../page-utils";

@IonicPage()
@Component({
    selector: 'page-try-to-schedule-with-other',
    templateUrl: 'try-to-schedule-with-other.html',
})
export class TryToScheduleWithOtherPage {
    person_uuid: string;
    distance: number = 1;
    max: number = 2;
    private callback: (person, distance, max) => void;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.callback = this.navParams.get('callback');
        if (!this.callback) {
            this.callback = (p, d, m) => {
            }
        }
    }

    get people(): Array<Person> {
        return this.rootStore.people.all;
    }

    dismiss() {
        this.navCtrl.pop();
    }

    save() {
        if (!this.person_uuid) {
            this.pageUtils.show_validation_error(ObjectValidation.simple("Person is required"));
            return;
        }
        let person = this.rootStore.findByUUID(this.person_uuid);
        this.callback(person, this.distance, this.max);
        this.navCtrl.pop();
    }

}
