import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PlanWizardPage} from './plan-wizard';
import {ResponsiveModule} from "ng2-responsive";
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        PlanWizardPage,
    ],
    imports: [
        ResponsiveModule,
        MobxAngularModule,
        ComponentsModule,
        IonicPageModule.forChild(PlanWizardPage),
    ],
})
export class PlanWizardPageModule {
}
