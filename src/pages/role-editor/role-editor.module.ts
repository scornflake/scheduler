import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RoleEditorPage} from './role-editor';
import {SchedulerDirectivesModule} from "../../common/directives";
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        RoleEditorPage,
    ],
    imports: [
        ComponentsModule,
        SchedulerDirectivesModule,
        IonicPageModule.forChild(RoleEditorPage),
    ],
})
export class RoleDetailPageModule {
}
