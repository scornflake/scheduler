import {Component, Input} from '@angular/core';
import {Person} from "../../scheduling/people";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'role-options',
    templateUrl: 'role-options.html'
})
export class RoleOptionsComponent {
    @Input() person: Person;

    constructor() {
    }

    get roles(): Array<Role> {
        if (this.person) {
            return this.person.roles;
        }
        return [];
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

    delete_role(role) {
        this.person.remove_role(role);
    }

    show_role_detail(role) {

    }
}
