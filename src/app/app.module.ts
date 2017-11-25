import {ErrorHandler, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {MyApp} from './app.component';

import {AboutPage} from '../pages/about/about';
import {HomePage} from '../pages/home/home';
import {TabsPage} from '../pages/tabs/tabs';
import {PeoplePage} from "../pages/people/people";

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {ScheduleCreatorProvider} from '../providers/schedule-creator/schedule-creator';
import {MobxAngularModule} from 'mobx-angular';
import {ComponentsModule} from "../components/components.module";
import {StoreProvider} from '../providers/store/store';
import {NgPipesModule} from "angular-pipes";

@NgModule({
    declarations: [
        MyApp,
        AboutPage,
        PeoplePage,
        HomePage,
        TabsPage
    ],
    imports: [
        BrowserModule,
        NgPipesModule,
        IonicModule.forRoot(MyApp),
        ComponentsModule,
        MobxAngularModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        AboutPage,
        PeoplePage,
        HomePage,
        TabsPage
    ],
    providers: [
        StatusBar,
        SplashScreen,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        StoreProvider,
        ScheduleCreatorProvider,
    ]
})
export class AppModule {
}
