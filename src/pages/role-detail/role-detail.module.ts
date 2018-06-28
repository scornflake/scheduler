import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {RoleDetailPage} from './role-detail';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        RoleDetailPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(RoleDetailPage),
    ],
})
export class RoleDetailPageModule {
}
