import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RolesPage} from './roles';
import {SchedulerDirectivesModule} from "../../common/directives";
import {ComponentsModule} from "../../components/components.module";
import {ResponsiveModule} from "ng2-responsive";

@NgModule({
    declarations: [
        RolesPage,
    ],
    imports: [
        ComponentsModule,
        SchedulerDirectivesModule,
        ResponsiveModule,
        IonicPageModule.forChild(RolesPage),
    ],
})
export class RolesPageModule {
}
