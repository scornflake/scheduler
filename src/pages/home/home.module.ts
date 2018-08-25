import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ComponentsModule} from "../../components/components.module";
import {HomePage} from "./home";
import {MobxAngularModule} from "mobx-angular";
import {ResponsiveModule} from "ng2-responsive";
import {SchedulerDirectivesModule} from "../../common/directives";
import {AgGridModule} from "../../../node_modules/ag-grid-angular/src/aggrid.module";
import {ScheduleViewerComponent} from "../../components/schedule-viewer/schedule-viewer";

@NgModule({
    declarations: [
        HomePage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        SchedulerDirectivesModule,
        ResponsiveModule,
        IonicPageModule.forChild(HomePage),
    ],
})
export class HomePageModule {
}
