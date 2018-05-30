import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RoleDetailPage} from './role-detail';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        RoleDetailPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(RoleDetailPage),
    ],
})
export class RoleDetailPageModule {
}
