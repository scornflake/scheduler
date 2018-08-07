import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Assignment} from "../../scheduling/assignment";
import {Role} from "../../scheduling/role";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {ResourceType} from "../../providers/access-control/access-control";

@IonicPage({
    name: 'page-role-plan-assignment',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-role-plan-assignment',
    templateUrl: 'role-plan-assignment.html',
})
export class RolePlanAssignmentPage {
    public role: Role;
    public assignment: Assignment;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.role = this.navParams.get('role') as Role;
        this.assignment = this.navParams.get('assignment') as Assignment;
    }

    ionViewDidLoad() {
        if (!this.role) {
            this.navCtrl.pop();
        }
    }

    get canEditPerson(): boolean {
        return this.pageUtils.canEdit(ResourceType.People, this.assignment.person.uuid == this.store.loggedInPerson.uuid);
    }


}
