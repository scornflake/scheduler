import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ComponentsModule} from "../../components/components.module";
import {PeoplePage} from "./people-page";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        PeoplePage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(PeoplePage),
    ],
})
export class PeoplePageModule {
}
