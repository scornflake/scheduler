import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'role-summary',
    templateUrl: 'role-summary.html'
})
export class RoleSummaryComponent {
    @Input() person: Person;
    @Output() tapped = new EventEmitter<Role>();

    constructor() {
    }

    get roles(): Array<Role> {
        if (this.person) {
            return this.person.roles;
        }
        return [];
    }

    weight_for(role: Role): string {
        return this.person.weight_for_role(role).toString();
    }

    delete_role(role) {
        this.person.remove_role(role);
    }

    show_role_detail(role:Role) {
        this.tapped.emit(role);
    }
}
