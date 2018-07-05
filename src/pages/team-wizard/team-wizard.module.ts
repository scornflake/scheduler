import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamWizardPage} from './team-wizard';
import {MobxAngularModule} from "mobx-angular";
import {ComponentsModule} from "../../components/components.module";
import {ResponsiveModule} from "ng2-responsive";

@NgModule({
    declarations: [
        TeamWizardPage,
    ],
    imports: [
        MobxAngularModule,
        ResponsiveModule,
        ComponentsModule,
        IonicPageModule.forChild(TeamWizardPage),
    ],
})
export class TeamWizardPageModule {
}
