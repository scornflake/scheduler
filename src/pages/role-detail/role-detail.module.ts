import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RoleDetailPage} from './role-detail';
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        RoleDetailPage,
    ],
    imports: [
        SchedulerDirectivesModule,
        IonicPageModule.forChild(RoleDetailPage),
    ],
})
export class RoleDetailPageModule {
}
