import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Assignment} from "../../scheduling/assignment";
import {ServiceRole} from "../../scheduling/service";

@Component({
    selector: 'role-summary',
    templateUrl: 'role-summary.html'
})
export class RoleSummaryComponent {
    @Input() assignment: Assignment;
    @Output() tapped = new EventEmitter<ServiceRole>();

    constructor() {
    }

    get roles(): Array<ServiceRole> {
        if (this.assignment) {
            return this.assignment.roles;
        }
        return [];
    }

    weight_for(role: ServiceRole): string {
        return this.assignment.weight_for_role(role).toString();
    }

    delete_role(role) {
        this.assignment.remove_role(role);
    }

    show_role_detail(role: ServiceRole) {
        this.tapped.emit(role);
    }
}
