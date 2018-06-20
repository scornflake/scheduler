import {Component, Input} from '@angular/core';
import {Organization} from "../../scheduling/organization";

@Component({
    selector: 'organization-editor',
    templateUrl: 'organization-editor.html'
})
export class OrganizationEditorComponent {
    @Input() organization: Organization;

    constructor() {
    }

}
