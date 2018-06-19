import {APP_INITIALIZER, ErrorHandler, Injector, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {MyApp} from './app.component';

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {ComponentsModule} from "../components/components.module";
import {NgPipesModule} from "angular-pipes";
import {HttpClientModule} from "@angular/common/http";
import {IonicStorageModule} from "@ionic/storage";
import {GAPIS} from "../common/gapis-auth";
import {SheetSelectionPageModule} from "../pages/sheet-selection/sheet-selection.module";
import {TabSelectionPageModule} from "../pages/tab-selection/tab-selection.module";
import {ConfigurationService} from "ionic-configuration-service";
import {LoggingService} from "ionic-logging-service";
import {loadConfiguration} from "./logging-configuration";
import {RESTServer} from "../providers/server/server";
import {HomePageModule} from "../pages/home/home.module";
import {LoginPageModule} from "../pages/login/login.module";
import {RootStore} from "../store/root";
import {PeoplePageModule} from "../pages/people/people-page.module";
import {AboutPageModule} from "../pages/about/about.module";
import {TeamsPageModule} from "../pages/teams/teams.module";
import {TeamPageModule} from "../pages/team/team.module";
import {PersonAssignmentPageModule} from "../pages/person-assignment/person-assignment.module";
import {PageUtils} from "../pages/page-utils";
import {DatabaseMaintPageModule} from "../pages/database-maint/database-maint.module";
import {TabsPage} from "../pages/tabs/tabs";
import {OrmMapper} from "../providers/mapping/orm-mapper";
import {scheduler_db_map} from "../assets/db.mapping";
import {SchedulerObjectStore} from "../scheduling/common/scheduler-store";
import {SchedulerDatabase} from "../providers/server/db";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {setupOrmMapper} from "../providers/mapping/setup";

@NgModule({
    declarations: [
        MyApp,
        TabsPage,
    ],
    imports: [
        HttpClientModule,
        BrowserModule,
        NgPipesModule,
        IonicModule.forRoot(MyApp),
        IonicStorageModule.forRoot(),
        ComponentsModule,
        SheetSelectionPageModule,
        TabSelectionPageModule,
        HomePageModule,
        LoginPageModule,
        PeoplePageModule,
        AboutPageModule,
        TeamsPageModule,
        TeamPageModule,
        PersonAssignmentPageModule,
        DatabaseMaintPageModule,
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        TabsPage,
    ],
    providers: [
        {
            provide: OrmMapper,
            useFactory: setupOrmMapper,
            deps: [],
        },
        {
            provide: APP_INITIALIZER,
            useFactory: loadConfiguration,
            deps: [ConfigurationService],
            multi: true
        },
        StatusBar,
        SplashScreen,
        RootStore,
        PageUtils,
        SchedulerServer,
        SchedulerDatabase,
        ConfigurationService,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        LoggingService,
        GAPIS,
        RESTServer
    ]
})

export class AppModule {
    static injector: Injector = null;

    constructor(injector: Injector) {
        AppModule.injector = injector;
    }
}
