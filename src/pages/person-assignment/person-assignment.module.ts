import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonAssignmentPage} from './person-assignment';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        PersonAssignmentPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(PersonAssignmentPage),
    ],
})
export class PersonAssignmentPageModule {
}
