import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {PersonAssignmentPage} from './person-assignment';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        PersonAssignmentPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(PersonAssignmentPage),
    ],
})
export class PersonAssignmentPageModule {
}