import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonDetailsPage} from './person-details';
import {ComponentsModule} from "../../components/components.module";
import {TryToScheduleWithOtherPageModule} from "../try-to-schedule-with-other/try-to-schedule-with-other.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        PersonDetailsPage,
    ],
    imports: [
        ComponentsModule,
        TryToScheduleWithOtherPageModule,
        MobxAngularModule,
        IonicPageModule.forChild(PersonDetailsPage),
    ],
})
export class PersonDetailsPageModule {
}
