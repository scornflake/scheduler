import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PlanDetailsPage} from './plan-details';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        PlanDetailsPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(PlanDetailsPage),
    ],
})
export class PlanDetailsPageModule {
}
