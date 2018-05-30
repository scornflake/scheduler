import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";
import {PersonEditorComponent} from './person-editor/person-editor';
import {ReasonsComponent} from './reasons/reasons';
import {ShowFormErrorsComponent} from "./show-form-errors/show-form-errors";
import {PersonDetailsComponent} from './person-details/person-details';
import { AvailabilityOptionsComponent } from './availability-options/availability-options';

@NgModule({
    declarations: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ShowFormErrorsComponent,
        ReasonsComponent,
        PersonDetailsComponent,
    AvailabilityOptionsComponent,
    ],
    imports: [
        IonicModule,
        NgPipesModule,
    ],
    exports: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ReasonsComponent,
        ShowFormErrorsComponent,
        PersonDetailsComponent,
    AvailabilityOptionsComponent
    ]
})
export class ComponentsModule {
}
