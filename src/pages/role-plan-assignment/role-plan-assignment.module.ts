import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RolePlanAssignmentPage} from './role-plan-assignment';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        RolePlanAssignmentPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(RolePlanAssignmentPage),
    ],
})
export class RolePlanAssignmentPageModule {
}
