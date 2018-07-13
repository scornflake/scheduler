import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ComponentsModule} from "../../components/components.module";
import {PeoplePage} from "./people-page";
import {MobxAngularModule} from "mobx-angular";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        PeoplePage,
    ],
    imports: [
        ComponentsModule,
        SchedulerDirectivesModule,
        MobxAngularModule,
        IonicPageModule.forChild(PeoplePage),
    ],
})
export class PeoplePageModule {
}
