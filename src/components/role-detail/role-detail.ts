import {Component, Input} from '@angular/core';
import {Role} from "../../scheduling/role";
import {Person} from "../../scheduling/people";
import {NavController} from "ionic-angular";

@Component({
    selector: 'role-detail',
    templateUrl: 'role-detail.html'
})
export class RoleDetailComponent {
    @Input('person') person: Person;
    @Input('role') role: Role;

    constructor(public navCtrl: NavController) {
    }

    get role_weightings() {
        return [1, 2, 3, 4, 5]
    }

    weight_for(role: Role): string {
        return this.person.weight_for_role(role).toString();
    }

    set_weight_for(role, new_weight: any) {
        console.log(`Set r: ${role} to new weight: ${new_weight}`);
        let weight_number = parseFloat(new_weight);
        this.person.set_weight_for_role(role, weight_number);
    }
}
