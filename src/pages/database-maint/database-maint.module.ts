import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {DatabaseMaintPage} from './database-maint';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        DatabaseMaintPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(DatabaseMaintPage),
    ],
})
export class DatabaseMaintPageModule {
}
