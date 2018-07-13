import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PlanDetailsPage} from './plan-details';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        PlanDetailsPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(PlanDetailsPage),
    ],
})
export class PlanDetailsPageModule {
}
