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
import {MobxAngularModule} from "mobx-angular";
import {ResponsiveConfig, ResponsiveModule} from "ng2-responsive";
import {ConnectivityService} from "../common/network/connectivity";
import {Network} from "@ionic-native/network";
import {NativePageTransitions} from "@ionic-native/native-page-transitions";
import {TeamWizardPageModule} from "../pages/team-wizard/team-wizard.module";
import {PlanWizardPageModule} from "../pages/plan-wizard/plan-wizard.module";
import {SchedulerDirectivesModule} from "../common/directives";
import {PermissionsProvider} from '../providers/permissions/permissions';
import {RolesPageModule} from "../pages/roles/roles.module";
import {RoleDetailPageModule} from "../pages/role-editor/role-editor.module";
import {EndpointsProvider} from '../providers/endpoints/endpoints';
import {StateProvider} from '../providers/state/state';
import {JWTAPIModule} from "../providers/token/jwt-api.module";
import {doAppInitializersDeterministic} from "../common/app-initializer";
import {AccessControlProvider} from '../providers/access-control/access-control';
import {SharePageModule} from "../pages/share/share.module";
import {MyErrorHandler} from "./the.error.handler";


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
        // Took out for now. Maybe add later, but for now just use existing Django functionality.
        // ForgotPasswordPageModule,
        PeoplePageModule,
        AboutPageModule,
        TeamsPageModule,
        TeamPageModule,
        RolesPageModule,
        RoleDetailPageModule,
        PersonAssignmentPageModule,
        DatabaseMaintPageModule,
        ResponsiveModule,
        TeamWizardPageModule,
        PlanWizardPageModule,
        SchedulerDirectivesModule,
        JWTAPIModule,
        SharePageModule,
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        TabsPage,
    ],
    providers: [
        StatusBar,
        ConfigurationService,
        Network,
        SplashScreen,
        RootStore,
        SchedulerServer,
        StateProvider,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        // {provide: ErrorHandler, useClass: MyErrorHandler},
        PageUtils,
        LoggingService,
        NativePageTransitions,
        ConnectivityService,
        GAPIS,
        RESTServer,
        PermissionsProvider,
        {
            provide: OrmMapper,
            useFactory: setupOrmMapper,
            deps: [LoggingService],
        },
        {
            provide: ResponsiveConfig,
            useFactory: ResponsiveDefinition
        },
        /*
        Careful with APP_INITIALIZER.
        You can get yourself into a situation where another provider uses injected objects, but they are not ready yet.
        Because: APP_INITIALIZER runs *after* the objects are all hooked together (or at least, after dependencies are resolved)
        e.g: Endpoints used to use ConfigurationService in its constructor. It was luck that it worked (for a while).
         */
        {
            provide: APP_INITIALIZER,
            useFactory: doAppInitializersDeterministic,
            deps: [ConfigurationService, LoggingService, StateProvider, EndpointsProvider],
            multi: true
        },
        EndpointsProvider,
        AccessControlProvider,
    ]
})

export class AppModule {
    static injector: Injector = null;
    static rootInjector: Injector;

    constructor(injector: Injector) {
        AppModule.injector = injector;
    }
}

