import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {FullPagePreviewPage} from './full-page-preview';
import {SchedulerDirectivesModule} from "../../common/directives";
import {ComponentsModule} from "../../components/components.module";
import {ResponsiveModule} from "ng2-responsive";

@NgModule({
    declarations: [
        FullPagePreviewPage,
    ],
    imports: [
        SchedulerDirectivesModule,
        ResponsiveModule,
        ComponentsModule,
        IonicPageModule.forChild(FullPagePreviewPage),
    ],
})
export class FullPagePreviewPageModule {
}
