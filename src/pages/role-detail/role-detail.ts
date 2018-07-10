import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Role} from "../../scheduling/role";

@IonicPage({
    name: 'page-role-detail',
    defaultHistory: ['page-roles', 'home']
})
@Component({
    selector: 'page-role-detail',
    templateUrl: 'role-detail.html',
})
export class RoleDetailPage {
    private role: Role;

    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.role = this.navParams.get('role') as Role;
    }

    ionViewDidLoad() {
        if (!this.role) {
            this.navCtrl.pop();
        }
    }

}
