import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PlansPage} from './plans';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        PlansPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(PlansPage),
    ],
})
export class PlansPageModule {
}
