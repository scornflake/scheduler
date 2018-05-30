import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {AvailabilityOptionsPage} from './availability-options';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        AvailabilityOptionsPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(AvailabilityOptionsPage),
    ],
})
export class AvailabilityOptionsPageModule {
}
