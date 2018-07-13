import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Organization} from "../../scheduling/organization";
import {observable} from "mobx-angular";

@Component({
    selector: 'organization-editor',
    templateUrl: 'organization-editor.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganizationEditorComponent {
    @observable @Input() organization: Organization;

    constructor() {
    }

}
