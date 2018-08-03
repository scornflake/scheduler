import {AuthorizationService} from "../../providers/token/authorization.service";
import {inject, TestBed} from "@angular/core/testing";
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {ConnectivityService} from "../../common/network/connectivity";
import {StorageMock} from "ionic-mocks";
import {EndpointsProvider} from "../../providers/endpoints/endpoints";
import {ConfigurationService} from "ionic-configuration-service";
import {MockConfigurationService, MockLoggingService} from "../mock-logging-configuration";
import {instance, mock, when} from "ts-mockito";
import {JWT_OPTIONS, JwtInterceptor} from '@auth0/angular-jwt';
import {JwtHelperService} from "@auth0/angular-jwt/src/jwthelper.service";
import {StateProvider} from "../../providers/state/state";
import {Storage} from "@ionic/storage";
import {IState} from "../../providers/state/state.interface";
import {HTTP_INTERCEPTORS, HttpClient} from "@angular/common/http";
import {UserResponse} from "../../common/interfaces";
import {APP_INITIALIZER, ApplicationInitStatus} from "@angular/core";
import {RefreshTokenInterceptor} from "../../providers/token/refresh.interceptor";
import {RESTServer} from "../../providers/server/server";
import {LoggingService} from "ionic-logging-service";
import {doAppInitializersDeterministic} from "../../common/app-initializer";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {setupOrmMapper} from "../../providers/mapping/setup";
import {RootStore} from "../../store/root";
import {TestILifecycleCallback} from "./server.callback";
import {HttpFlush} from "./test-helpers";

let initialState: IState = {
    loginToken: "iAmAToken",
    lastPersonUUID: "9876",
    lastOrganizationUUID: "1234",
    isForcedOffline: false
};

let optionsFactory = (st) => {
    return {
        tokenGetter: () => {
            // console.log(`Returning token: ${st.loginToken}`);
            return st.loginToken;
        },
        blacklistedRoutes: [],
        whitelistedDomains: [
            "localhost:8000",
            "scheduler.shinywhitebox.com",
            "schedulerdb.shinywhitebox.com"
        ]
    }
};

describe('server integration', () => {
    let connectivityMock: ConnectivityService;
    let connectivityInstance: ConnectivityService;

    let ur: UserResponse = {
        id: 2,
        email: "womsohtrtjk@rjkwr",
        is_active: true,
        first_name: "neil",
        last_name: "scud",
        uuid: "12345678sd--sd",
        organization_uuid: "org-scud-missile",
    };

    beforeEach(async () => {
        connectivityMock = mock(ConnectivityService);
        connectivityInstance = instance(connectivityMock);
        when(connectivityMock.isOnline).thenReturn(true);

        await TestBed.configureTestingModule({
            declarations: [],
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                {
                    provide: OrmMapper,
                    useFactory: setupOrmMapper,
                    deps: [LoggingService],
                },
                RESTServer,
                RootStore,
                {provide: LoggingService, useClass: MockLoggingService},
                AuthorizationService,
                JwtHelperService,
                JwtInterceptor,
                EndpointsProvider,
                RefreshTokenInterceptor,
                SchedulerServer,
                StateProvider,
                {
                    provide: APP_INITIALIZER,
                    useFactory: doAppInitializersDeterministic,
                    deps: [ConfigurationService, LoggingService, StateProvider, EndpointsProvider],
                    multi: true
                },
                {
                    provide: ConfigurationService,
                    useFactory: (http) => new MockConfigurationService(http),
                    deps: [HttpClient],
                },
                {
                    provide: Storage,
                    useFactory: () => StorageMock.instance('state', initialState),
                },
                {provide: ConnectivityService, useFactory: () => connectivityInstance},
                {
                    provide: JWT_OPTIONS,
                    useFactory: optionsFactory,
                    deps: [StateProvider]
                },
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: JwtInterceptor,
                    multi: true
                },
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: RefreshTokenInterceptor,
                    multi: true
                },
            ],
        }).compileComponents();

        //https://github.com/angular/angular/issues/24218
        // noinspection BadExpressionStatementJS
        await TestBed.get(ApplicationInitStatus).donePromise;
    });

    it('should go to a login page if a refresh responds with "user not active"', (done) => {
        // The first 'expired'
        inject([HttpClient, HttpTestingController, SchedulerServer, StateProvider, ConnectivityService], (http, backend, server, state, connectivity) => {

            expect(state).not.toBeNull("what happened to STATE?");
            expect(state.state).not.toBeNull("what happened to STATE STATE?");

            expect(state.hasStateChangedSinceLastLifecycleRun()).toBeTruthy();
            expect(connectivity.isOnline).toBeTruthy("not connected!");

            let lcc = new TestILifecycleCallback();
            server.asyncRunStartupLifecycle(lcc).then(r => {
                expect(lcc.showedLoginPage).toBeTruthy();
                expect(lcc.lastLoginReason).toContain("Login token invalid");
                done();
            });

            // The user. Return a refresh request failure, causing a token refresh
            let userRequest = backend.expectOne(r => r.url.includes('api/user'));
            HttpFlush.expiredTokenResponse(userRequest);

            // When refreshing token, don't. Act like the account has been locked.
            let refreshRequest = backend.expectOne(r => r.url.includes('api-token-refresh/'));
            HttpFlush.userAccountInactive(refreshRequest);
        })();
    }, 3000);
});
