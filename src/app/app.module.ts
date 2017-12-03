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
import {MobxAngularModule} from 'mobx-angular';
import {ComponentsModule} from "../components/components.module";
import {NgPipesModule} from "angular-pipes";
import {RootStore} from "../state/root";
import {Apollo, ApolloModule} from "apollo-angular";
import {HttpLink, HttpLinkModule} from "apollo-angular-link-http";
import {HttpClientModule} from "@angular/common/http";
import {DataStoreProvider} from '../providers/data-store/data-store';
import {defaultConfiguration} from "../config/configuration";

export function defaultDSPSetup(store, apollo, link) {
    return new DataStoreProvider(apollo, link, store, defaultConfiguration);
}

@NgModule({
    declarations: [
        MyApp,
        AboutPage,
        PeoplePage,
        HomePage,
        TabsPage
    ],
    imports: [
        HttpClientModule,
        BrowserModule,
        NgPipesModule,
        IonicModule.forRoot(MyApp),
        ComponentsModule,
        MobxAngularModule,
        ApolloModule,
        HttpLinkModule,
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
        RootStore,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        {
            provide: DataStoreProvider,
            useFactory: defaultDSPSetup,
            deps: [RootStore, Apollo, HttpLink]
        }
    ]
})
export class AppModule {
}
