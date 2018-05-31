import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Role} from "../../scheduling/role";
import {Person} from "../../scheduling/people";

@IonicPage()
@Component({
    selector: 'page-role-detail',
    templateUrl: 'role-detail.html',
})
export class RoleDetailPage {
    role: Role;
    person: Person;

    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.role = this.navParams.get('role');
        this.person = this.navParams.get('person');
    }

    ionViewDidLoad() {
        if (!this.role || !this.person) {
            // pop back to home, for debugging
            this.navCtrl.setRoot('people')
        }

    }
}
