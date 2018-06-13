import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TeamsPage} from './teams';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
    declarations: [
        TeamsPage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(TeamsPage),
    ],
})
export class TeamsPageModule {
}
