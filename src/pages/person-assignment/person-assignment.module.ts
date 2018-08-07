import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonAssignmentPage} from './person-assignment';
import {ComponentsModule} from "../../components/components.module";
import {ResponsiveModule} from "ng2-responsive";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        PersonAssignmentPage,
    ],
    imports: [
        ComponentsModule,
        ResponsiveModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(PersonAssignmentPage),
    ],
})
export class PersonAssignmentPageModule {
}
