import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamsPage} from './teams';
import {ComponentsModule} from "../../components/components.module";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        TeamsPage,
    ],
    imports: [
        ComponentsModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(TeamsPage),
    ],
})
export class TeamsPageModule {
}
