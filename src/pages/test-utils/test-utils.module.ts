import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TestUtilsPage} from './test-utils';
import {ComponentsModule} from "../../components/components.module";
import {MobxAngularModule, MobxAutorunDirective} from "mobx-angular";

@NgModule({
    declarations: [
        TestUtilsPage,
    ],
    imports: [
        ComponentsModule,
        MobxAngularModule,
        IonicPageModule.forChild(TestUtilsPage),
    ],
})
export class TestUtilsPageModule {
}
