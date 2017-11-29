import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";
import {PersonEditorComponent} from './person-editor/person-editor';
import {ReasonsComponent} from './reasons/reasons';

@NgModule({
    declarations: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ReasonsComponent
    ],
    imports: [
        IonicModule,
        NgPipesModule,
    ],
    exports: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ReasonsComponent
    ]
})
export class ComponentsModule {
}
