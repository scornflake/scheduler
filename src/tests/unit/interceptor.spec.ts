import {AuthorizationService} from "../../providers/token/authorization.service";
import {async, inject, TestBed} from "@angular/core/testing";
import {MyApp} from "../../app/app.component";
import {IonicModule} from "ionic-angular";
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {ConnectivityService} from "../../common/network/connectivity";
import {NetworkMock, StorageMock} from "ionic-mocks";
import {EndpointsProvider} from "../../providers/endpoints/endpoints";
import {ConfigurationService} from "ionic-configuration-service";
import {MockConfigurationService} from "../../app/logging-configuration";
import {Network} from "@ionic-native/network";
import {instance, mock} from "ts-mockito";
import {JwtInterceptor, JwtModule} from '@auth0/angular-jwt';
import {JwtHelperService} from "@auth0/angular-jwt/src/jwthelper.service";
import {loadStateAsPromise, StateProvider} from "../../providers/state/state";
import {Storage} from "@ionic/storage";
import {IState} from "../../providers/state/state.interface";
import {JWT_OPTIONS} from '@auth0/angular-jwt';
import {HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, HttpRequest} from "@angular/common/http";
import {LoginResponse, UserResponse} from "../../common/interfaces";
import {APP_INITIALIZER, ApplicationInitStatus} from "@angular/core";
import {RefreshTokenInterceptor} from "../../providers/token/refresh.interceptor";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {JWTAPIModule, jwtOptionsFactory} from "../../providers/token/jwt-api.module";
import {httpFactory} from "@angular/http/src/http_module";

let initialState: IState = {
    loginToken: "",
    lastPersonUUID: null,
    lastOrganizationUUID: null,
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

describe('refresh interceptor tests', () => {
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
        organization_token: "I am a token gesture"
    };

    beforeEach(async(() => {
        connectivityMock = mock(ConnectivityService);
        connectivityInstance = instance(connectivityMock);

        TestBed.configureTestingModule({
            declarations: [MyApp],
            imports: [
                HttpClientTestingModule,
                IonicModule.forRoot(MyApp)
            ],
            providers: [
                AuthorizationService,
                JwtHelperService,
                JwtInterceptor,
                EndpointsProvider,
                RefreshTokenInterceptor,
                StateProvider,
                {
                    provide: APP_INITIALIZER,
                    useFactory: loadStateAsPromise,
                    deps: [StateProvider],
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
                {
                    provide: ConnectivityService,
                    useFactory: () => connectivityInstance,
                },
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
        }).compileComponents().then(() => {
        });

        //https://github.com/angular/angular/issues/24218
        // noinspection BadExpressionStatementJS
        TestBed.get(ApplicationInitStatus).donePromise;

    }));

    it('we understand whitelisting', () => {
        inject([JwtInterceptor], (jwt) => {
            expect(jwt).not.toBeNull();
            expect(jwt.isWhitelistedDomain(new HttpRequest("GET", "http://localhost:8000"))).toBeTruthy("localhost should work");
            expect(jwt.isWhitelistedDomain(new HttpRequest("GET", "https://scheduler.shinywhitebox.com"))).toBeTruthy("actual URL should work");
            expect(jwt.isWhitelistedDomain(new HttpRequest("GET", "http://naaaa:8000"))).toBeFalsy("unknown should fail");
        })();
    });

    it('JWT interceptor uses Authorization as header name', () => {
        inject([JwtInterceptor], (jwt) => {
            expect(jwt.headerName).toEqual('Authorization');
        })();
    });

    it('should refresh token if its expired', function (done) {
        inject([HttpClient, HttpTestingController, StateProvider], (http, backend, st) => {
            // any HTTP call should sent a token. That token can be refreshed.
            st.setLoginToken("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMywidXNlcm5hbWUiOiJuZWlsQGNsb3VkbmluZS5uZXQubnoiLCJleHAiOjE1MzI5MDYyNTUsImVtYWlsIjoibmVpbEBjbG91ZG5pbmUubmV0Lm56Iiwib3JpZ19pYXQiOjE1MzI5MDYyNTQsInVpZCI6ImViMWU1NDUzOTAzNTQ2MjliMmMxNGU1YTQwYTcxNDE2ODUxYzRmNjYzYWE5MTg1NmNiNTU2MWRlMWM2NDZhMzgiLCJyb2xlcyI6WyJtYW5hZ2VyX2JmZDliZWU3LWYxYTEtNDIxMi1iZTAzLTA4NGYwNTUwOGMwNiJdfQ.40E4T1TiEJ22qwUNMQ3Ygq6zBAPrxuGiOClnOOa9fvA");
            http.get("api/user").subscribe(r => {
                console.log(`HTTP finally got: ${SWBSafeJSON.stringify(r)}`);
                done();
            });

            // This makes the first call fail
            let httpRequest = backend.expectOne(r => r.url.includes("api/user"));
            httpRequest.flush({"detail": "Signature has expired."}, {
                status: 401,
                error: {
                    message: "token expired"
                },
                statusText: 'Unauthorized'
            });

            let nextGoodToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyMywidXNlcm5hbWUiOiJuZWlsQGNsb3VkbmluZS5uZXQubnoiLCJleHAiOjE1MzMwODA4NzYsImVtYWlsIjoibmVpbEBjbG91ZG5pbmUubmV0Lm56Iiwib3JpZ19pYXQiOjE1MzMwNzk2NzYsInVpZCI6ImViMWU1NDUzOTAzNTQ2MjliMmMxNGU1YTQwYTcxNDE2ODUxYzRmNjYzYWE5MTg1NmNiNTU2MWRlMWM2NDZhMzgiLCJyb2xlcyI6WyJtYW5hZ2VyX2JmZDliZWU3LWYxYTEtNDIxMi1iZTAzLTA4NGYwNTUwOGMwNiJdfQ.eyQRvD8dvzkxVqG0VtBzN9tpV8AhJqImuh3Vt0qe1Uo";
            let refreshPost = backend.expectOne(r => r.url.includes("api-token-refresh/"));
            refreshPost.flush({"token": nextGoodToken});

            let goodReq = backend.expectOne(r => {
                console.log(`r2 headers: ${SWBSafeJSON.stringify(r.headers)}`);
                return r.url.includes("api/user") &&
                    r.headers.has('Authorization') &&
                    r.headers.get('Authorization') === `Bearer ${nextGoodToken}`;
            });
            goodReq.flush({"user": 42});

            backend.verify();
        })();
    });

    it('should clear token if token refresh fails', function (done) {
        done();
    });
});
