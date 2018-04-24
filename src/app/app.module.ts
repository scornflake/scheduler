import {APP_INITIALIZER, ErrorHandler, Injector, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {MyApp} from './app.component';

import {AboutPage} from '../pages/about/about';
import {TabsPage} from '../pages/tabs/tabs';
import {PeoplePage} from "../pages/people/people";

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {ComponentsModule} from "../components/components.module";
import {NgPipesModule} from "angular-pipes";
import {ApolloModule} from "apollo-angular";
import {HttpLinkModule} from "apollo-angular-link-http";
import {HttpClientModule} from "@angular/common/http";
import {IonicStorageModule} from "@ionic/storage";
import {GAPIS} from "../common/gapis-auth";
import {SheetSelectionPageModule} from "../pages/sheet-selection/sheet-selection.module";
import {TabSelectionPageModule} from "../pages/tab-selection/tab-selection.module";
import {ConfigurationService} from "ionic-configuration-service";
import {LoggingService} from "ionic-logging-service";
import {loadConfiguration} from "./logging-configuration";
import {ServerProvider} from "../providers/server/server";
import {HomePageModule} from "../pages/home/home.module";
import {LoginPageModule} from "../pages/login/login.module";
import {RootStore} from "../store/root";

// export function defaultDSPSetup(apollo, link) {
//     return new DataStoreProvider(apollo, link, defaultConfiguration);
// }

@NgModule({
    declarations: [
        MyApp,
        AboutPage,
        PeoplePage,
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
        TabSelectionPageModule,
        HomePageModule,
        LoginPageModule

    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        AboutPage,
        PeoplePage,
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
        // {
        //     provide: DataStoreProvider,
        //     useFactory: defaultDSPSetup,
        //     deps: [Apollo, HttpLink]
        // },
        LoggingService,
        GAPIS,
        ServerProvider
    ]
})

export class AppModule {
    static injector: Injector;

    constructor(injector: Injector) {
        AppModule.injector = injector;
    }
}
