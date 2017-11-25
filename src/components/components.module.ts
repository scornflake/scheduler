import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";

@NgModule({
    declarations: [ScheduleViewerComponent],
    imports: [IonicModule, NgPipesModule],
    exports: [ScheduleViewerComponent]
})
export class ComponentsModule {
}
