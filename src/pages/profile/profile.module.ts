import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ProfilePage} from './profile';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        ProfilePage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(ProfilePage),
    ],
})
export class ProfilePageModule {
}
