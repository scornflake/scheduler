import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ForgotPasswordPage} from './forgot-password';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule} from "mobx-angular";

@NgModule({
    declarations: [
        ForgotPasswordPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(ForgotPasswordPage),
    ],
})
export class ForgotPasswordPageModule {
}
