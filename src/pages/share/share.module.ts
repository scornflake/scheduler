import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {SharePage} from './share';
import {SchedulerDirectivesModule} from "../../common/directives";

@NgModule({
    declarations: [
        SharePage,
    ],
    imports: [
        IonicPageModule.forChild(SharePage),
        SchedulerDirectivesModule
    ],
})
export class SharePageModule {
}
