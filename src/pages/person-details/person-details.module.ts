import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonDetailsPage} from './person-details';
import {ComponentsModule} from "../../components/components.module";
import {AvailabilityOptionsPageModule} from "../availability-options/availability-options.module";
import {AvailabilityOptionsPage} from "../availability-options/availability-options";

@NgModule({
    declarations: [
        PersonDetailsPage,
    ],
    imports: [
        ComponentsModule,
        AvailabilityOptionsPageModule,
        IonicPageModule.forChild(PersonDetailsPage),
    ],
})
export class PersonDetailsPageModule {
}
