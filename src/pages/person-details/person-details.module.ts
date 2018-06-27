import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonDetailsPage} from './person-details';
import {ComponentsModule} from "../../components/components.module";
import {TryToScheduleWithOtherPageModule} from "../try-to-schedule-with-other/try-to-schedule-with-other.module";

@NgModule({
    declarations: [
        PersonDetailsPage,
    ],
    imports: [
        ComponentsModule,
        TryToScheduleWithOtherPageModule,
        IonicPageModule.forChild(PersonDetailsPage),
    ],
})
export class PersonDetailsPageModule {
}
