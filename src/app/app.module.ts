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
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {setupOrmMapper} from "../providers/mapping/setup";
// import {CalendarModule} from "ionic3-calendar-en";
// import {CalendarComponent} from "../components/swbcalendar/swbcalendar";
import {MobxAngularModule} from "mobx-angular";
import {ResponsiveConfig, ResponsiveModule} from "ng2-responsive";

let config = {
    breakPoints: {
        xs: {max: 575},
        sm: {min: 576, max: 767},
        md: {min: 768, max: 991},
        lg: {min: 992, max: 1199},
        xl: {min: 1200}
    },
    debounceTime: 100 // allow to debounce checking timer
};

export function ResponsiveDefinition() {
    return new ResponsiveConfig(config);
}

@NgModule({
    declarations: [
        MyApp,
        TabsPage,
        // CalendarComponent,
    ],
    imports: [
        MobxAngularModule,
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
        // CalendarModule,
        ResponsiveModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        TabsPage,
        // CalendarComponent
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
        SchedulerServer,
        ConfigurationService,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        PageUtils,
        LoggingService,
        GAPIS,
        RESTServer,
        [{
            provide: ResponsiveConfig,
            useFactory: ResponsiveDefinition
        }]
    ]
})

export class AppModule {
    static injector: Injector = null;
    static rootInjector: Injector;

    constructor(injector: Injector) {
        AppModule.injector = injector;
    }
}
