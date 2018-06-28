import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamPage} from './team';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        TeamPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(TeamPage),
    ],
})
export class TeamPageModule {
}
