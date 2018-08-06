import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Role} from "../../scheduling/role";
import {RootStore} from "../../store/root";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";

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
                public accessControl: AccessControlProvider,
                public navParams: NavParams) {
        this.role = this.navParams.get('role') as Role;
    }

    get canManage(): boolean {
        let answer = this.accessControl.canMaintain(ResourceType.Role);
        return this.accessControl.canMaintain(ResourceType.Role);
    }

    setName(role:Role, name:string) {
        if(this.canManage) {
            role.setName(name);
        }
    }

    ionViewDidLoad() {
        if (!this.role) {
            this.navCtrl.pop();
        }
    }

}
