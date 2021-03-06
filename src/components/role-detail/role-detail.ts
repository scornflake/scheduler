import {Component, Input} from '@angular/core';
import {NavController} from "ionic-angular";
import {Assignment} from "../../scheduling/assignment";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'role-detail',
    templateUrl: 'role-detail.html'
})
export class RoleDetailComponent {
    @Input('assignment') assignment: Assignment;
    @Input('role') role: Role;
    @Input() readonly: boolean = false;

    constructor(public navCtrl: NavController) {
    }

    get role_weightings() {
        return [1, 2, 3, 4, 5]
    }

    weight_for(role: Role): string {
        return this.assignment.weight_for_role(role).toString();
    }

    set_weight_for(role, new_weight: any) {
        console.log(`Set r: ${role} to new weight: ${new_weight}`);
        let weight_number = parseFloat(new_weight);
        this.assignment.set_weight_for_role(role, weight_number);
    }
}
