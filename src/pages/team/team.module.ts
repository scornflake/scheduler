import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamPage} from './team';
import {ComponentsModule} from "../../components/components.module";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        TeamPage,
    ],
    imports: [
        ComponentsModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(TeamPage),
    ],
})
export class TeamPageModule {
}
