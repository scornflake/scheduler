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
import {JwtInterceptor} from '@auth0/angular-jwt';
import {JwtHelperService} from "@auth0/angular-jwt/src/jwthelper.service";
import {loadStateAsPromise, StateProvider} from "../../providers/state/state";
import {Storage} from "@ionic/storage";
import {IState} from "../../providers/state/state.interface";
import {JWT_OPTIONS} from '@auth0/angular-jwt';
import {HttpClient} from "@angular/common/http";
import {LoginResponse, UserResponse} from "../../common/interfaces";
import {APP_INITIALIZER, ApplicationInitStatus} from "@angular/core";

let state: IState = {
    loginToken: "",
    lastPersonUUID: null,
    lastOrganizationUUID: null,
    isForcedOffline: false
};

let optionsFactory = () => {
    return {
        tokenGetter: () => {
            return state.loginToken;
        },
        blacklistedRoutes: []
    }
};

describe('auth and state tests', () => {
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
                StateProvider,
                {
                    provide: APP_INITIALIZER,
                    useFactory: loadStateAsPromise,
                    deps: [StateProvider],
                    multi: true
                },
                {
                    provide: Network,
                    useFactory: () => NetworkMock.instance('wifi'),
                },
                {
                    provide: ConfigurationService,
                    useFactory: (http) => new MockConfigurationService(http),
                    deps: [HttpClient],
                },
                {
                    provide: Storage,
                    useFactory: () => StorageMock.instance('state', state),
                },
                {
                    provide: ConnectivityService,
                    useFactory: () => connectivityInstance,
                },
                {
                    provide: JWT_OPTIONS,
                    useFactory: optionsFactory,
                },
                EndpointsProvider,
            ],
        }).compileComponents().then(() => {
        });

        //https://github.com/angular/angular/issues/24218
        // noinspection BadExpressionStatementJS
        TestBed.get(ApplicationInitStatus).donePromise;
    }));

    it('good login sets both login token, and person UUID', () => {
        let lr: LoginResponse = {
            ok: true,
            detail: "",
            token: "some-JWT-token",
            user: ur
        };

        let sc = TestBed.get(StateProvider);
        expect(sc.state.loginToken).toEqual(state.loginToken);
        expect(sc.state.lastPersonUUID).toEqual(state.lastPersonUUID);

        sc.setLoginTokenFromLoginResponse(true, lr);

        expect(sc.loginToken).toEqual(lr.token);
        expect(sc.state.lastPersonUUID).toEqual(ur.uuid);
    });

    it('should not run cycle twice, aka: able to detect that it is ok', function () {
        // This is a bit of a fudge.
        // We put the server into a state where it thinks it's logged in OK.
        // We want to ensure that it's not actually going to reload/reassign the DB
        // if the current user token remains valid.

        state = {
            loginToken: "abcefg",
            lastPersonUUID: "!2345",
            lastOrganizationUUID: "abcdefg",
            isForcedOffline: false
        };

        expect(state.lastPersonUUID).not.toBeFalsy();

        let stateProv = TestBed.get(StateProvider);

        expect(stateProv.hasStateChangedSinceLastLifecycleRun()).toBeTruthy();
        stateProv.captureStateAsPrevious();
        expect(stateProv.hasStateChangedSinceLastLifecycleRun()).toBeFalsy();

        // if we change the force flag, that shouldnt affect the comparison.
        stateProv.state.isForcedOffline = true;
        expect(stateProv.hasStateChangedSinceLastLifecycleRun()).toBeFalsy();

    });

    it('should set login token if login succeeds', (done) => {
        inject([AuthorizationService, StateProvider, HttpClient, HttpTestingController], (auth, sProv, http, backend) => {
            let lr: LoginResponse = {
                ok: true,
                detail: "token washed up on shore, empty",
                token: "I'm a super token!",
                user: ur
            };

            auth.login('someone', 'hazzah!').subscribe(r => {
                expect(sProv.loginToken).toEqual("I'm a super token!");
                done();
            });

            backend.expectOne(r => r.url.includes("api/login")).flush(lr);
        })();
    });

    it('should clear token if login fails', (done) => {
        inject([AuthorizationService, StateProvider, HttpClient, HttpTestingController], (auth, sProv, http, backend) => {
            let lr: LoginResponse = {
                ok: false,
                detail: "token washed up on shore, empty",
                token: "who cares",
                user: null // intentional cos login FAILED
            };

            auth.login('someone', 'hazzah!').subscribe(r => {
                expect(sProv.loginToken).toBeNull();
                done();
            });

            backend.expectOne(r => r.url.includes("api/login")).flush(lr);
        })();
    });
});
