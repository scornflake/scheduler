import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {FullPagePreviewPage} from './full-page-preview';
import {MobxTraceAutorun, SchedulerDirectivesModule} from "../../common/directives";
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";
import {ResponsiveModule} from "ng2-responsive";

@NgModule({
    declarations: [
        FullPagePreviewPage,
    ],
    imports: [
        SchedulerDirectivesModule,
        MobxAngularModule,
        ResponsiveModule,
        ComponentsModule,
        IonicPageModule.forChild(FullPagePreviewPage),
    ],
})
export class FullPagePreviewPageModule {
}
