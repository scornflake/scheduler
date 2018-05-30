import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonDetailsPage} from './person-details';
import {ComponentsModule} from "../../components/components.module";
import {AvailabilityOptionsPageModule} from "../availability-options/availability-options.module";
import {TryToScheduleWithOtherPageModule} from "../try-to-schedule-with-other/try-to-schedule-with-other.module";

@NgModule({
    declarations: [
        PersonDetailsPage,
    ],
    imports: [
        ComponentsModule,
        AvailabilityOptionsPageModule,
        TryToScheduleWithOtherPageModule,
        IonicPageModule.forChild(PersonDetailsPage),
    ],
})
export class PersonDetailsPageModule {
}
