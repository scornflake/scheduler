import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamPage} from './team';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        TeamPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(TeamPage),
    ],
})
export class TeamPageModule {
}
