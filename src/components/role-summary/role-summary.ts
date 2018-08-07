import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Assignment} from "../../scheduling/assignment";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'role-summary',
    templateUrl: 'role-summary.html'
})
export class RoleSummaryComponent {
    @Input() readonly: boolean = false;
    @Input() assignment: Assignment;
    @Output() tapped = new EventEmitter<Role>();

    constructor() {
    }

    get roles(): Array<Role> {
        if (this.assignment) {
            return this.assignment.roles;
        }
        return [];
    }

    weight_for(role: Role): string {
        return this.assignment.weight_for_role(role).toString();
    }

    delete_role(role) {
        this.assignment.remove_role(role);
    }

    show_role_detail(role: Role) {
        this.tapped.emit(role);
    }
}
