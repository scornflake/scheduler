import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {DatabaseMaintPage} from './database-maint';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        DatabaseMaintPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(DatabaseMaintPage),
    ],
})
export class DatabaseMaintPageModule {
}
