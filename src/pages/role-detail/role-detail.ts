import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Role} from "../../scheduling/role";
import {Assignment} from "../../scheduling/assignment";

@IonicPage()
@Component({
    selector: 'page-role-detail',
    templateUrl: 'role-detail.html',
})
export class RoleDetailPage {
    role: Role;
    assignment: Assignment;

    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.role = this.navParams.get('role');
        this.assignment = this.navParams.get('assignment');
    }

    ionViewDidLoad() {
        if (!this.role || !this.assignment) {
            // pop back to home, for debugging
            this.navCtrl.setRoot('people')
        }

    }
}
