import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {SharePage} from './share';
import {SchedulerDirectivesModule} from "../../common/directives";
import {ProgressBarModule} from "angular-progress-bar";

@NgModule({
    declarations: [
        SharePage,
    ],
    imports: [
        IonicPageModule.forChild(SharePage),
        SchedulerDirectivesModule,
        ProgressBarModule
    ],
})
export class SharePageModule {
}
