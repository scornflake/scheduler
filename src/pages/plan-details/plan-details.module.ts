import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PlanDetailsPage} from './plan-details';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        PlanDetailsPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(PlanDetailsPage),
    ],
})
export class PlanDetailsPageModule {
}
