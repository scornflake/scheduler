import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamsPage} from './teams';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        TeamsPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(TeamsPage),
    ],
})
export class TeamsPageModule {
}
