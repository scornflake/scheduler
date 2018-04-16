import {APP_INITIALIZER, ErrorHandler, Injector, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {MyApp} from './app.component';

import {AboutPage} from '../pages/about/about';
import {HomePage} from '../pages/home/home';
import {TabsPage} from '../pages/tabs/tabs';
import {PeoplePage} from "../pages/people/people";

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {ComponentsModule} from "../components/components.module";
import {NgPipesModule} from "angular-pipes";
import {RootStore} from "../state/root";
import {Apollo, ApolloModule} from "apollo-angular";
import {HttpLink, HttpLinkModule} from "apollo-angular-link-http";
import {HttpClientModule} from "@angular/common/http";
import {DataStoreProvider} from '../providers/data-store/data-store';
import {defaultConfiguration} from "../config/configuration";
import {IonicStorageModule} from "@ionic/storage";
import {GAPIS} from "../common/gapis-auth";
import {SheetSelectionPageModule} from "../pages/sheet-selection/sheet-selection.module";
import {TabSelectionPageModule} from "../pages/tab-selection/tab-selection.module";
import {ConfigurationService} from "ionic-configuration-service";
import {LoggingService} from "ionic-logging-service";
import {loadConfiguration} from "./logging-configuration";

export function defaultDSPSetup(apollo, link) {
    return new DataStoreProvider(apollo, link, defaultConfiguration);
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
        IonicStorageModule.forRoot(),
        ComponentsModule,
        ApolloModule,
        HttpLinkModule,
        SheetSelectionPageModule,
        TabSelectionPageModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        AboutPage,
        PeoplePage,
        HomePage,
        TabsPage,
    ],
    providers: [
        StatusBar,
        SplashScreen,
        RootStore,
        ConfigurationService,
        {
            provide: APP_INITIALIZER,
            useFactory: loadConfiguration,
            deps: [ConfigurationService],
            multi: true
        },
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        {
            provide: DataStoreProvider,
            useFactory: defaultDSPSetup,
            deps: [Apollo, HttpLink]
        },
        LoggingService,
        GAPIS
    ]
})

export class AppModule {
    static injector: Injector;

    constructor(injector: Injector) {
        AppModule.injector = injector;
    }
}
