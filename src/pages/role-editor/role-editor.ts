import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Role} from "../../scheduling/role";
import {RootStore} from "../../store/root";

@IonicPage({
    name: 'page-role-editor',
    defaultHistory: ['page-roles', 'home']
})
@Component({
    selector: 'page-role-editor',
    templateUrl: 'role-editor.html',
})
export class RoleEditorPage {
    private role: Role;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public navParams: NavParams) {
        this.role = this.navParams.get('role') as Role;
    }

    ionViewDidLoad() {
        if (!this.role) {
            this.navCtrl.pop();
        }
    }

}
