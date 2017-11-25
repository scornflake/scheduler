import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";
import {PersonEditorComponent} from './person-editor/person-editor';

@NgModule({
    declarations: [
        ScheduleViewerComponent,
        PersonEditorComponent
    ],
    imports: [
        IonicModule,
        NgPipesModule
    ],
    exports: [
        ScheduleViewerComponent,
        PersonEditorComponent
    ]
})
export class ComponentsModule {
}
