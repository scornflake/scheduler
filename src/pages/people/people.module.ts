import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ComponentsModule} from "../../components/components.module";
import {PeoplePage} from "./people";

@NgModule({
    declarations: [
        PeoplePage,
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(PeoplePage),
    ],
})
export class PeoplePageModule {
}
