import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamPage} from './team';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        TeamPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(TeamPage),
    ],
})
export class TeamPageModule {
}
