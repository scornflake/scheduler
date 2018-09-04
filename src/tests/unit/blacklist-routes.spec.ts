import {generateBlacklistedRoutes} from "../../providers/token/jwt-configuration";
import {inject, TestBed} from "@angular/core/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {LoggingService} from "ionic-logging-service";
import {ConnectivityServiceMock, waitForTestBedInitializers} from "./test-helpers";
import {JWT_OPTIONS, JwtInterceptor} from "@auth0/angular-jwt";
import {StateProvider} from "../../providers/state/state";
import {HTTP_INTERCEPTORS, HttpRequest} from "@angular/common/http";
import {MockLoggingService} from "../mock-logging-configuration";
import {jwtOptionsFactory} from "../../providers/token/jwt-api.module";
import {Storage} from "@ionic/storage";
import {StorageMock} from "ionic-mocks";
import {JwtHelperService} from "@auth0/angular-jwt/src/jwthelper.service";

describe('JWT blacklisting', () => {

    beforeEach(async () => {
        TestBed.configureTestingModule({
            declarations: [],
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                ConnectivityServiceMock.Provider(),
                JwtHelperService,
                {provide: LoggingService, useClass: MockLoggingService},
                StateProvider,
                JwtInterceptor,
                {
                    provide: Storage,
                    useFactory: () => StorageMock.instance('state', {}),
                },
                {
                    provide: JWT_OPTIONS,
                    useFactory: jwtOptionsFactory,
                    deps: [StateProvider]
                },
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: JwtInterceptor,
                    multi: true
                },

            ]
        });

        await waitForTestBedInitializers();
    });

    it('should have some routes', () => {
        let list = generateBlacklistedRoutes();
        expect(list.length).toBeGreaterThan(2);
    });

    it('should blacklist /api/validate_login', () => {
        inject([JwtInterceptor], (jwt) => {
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://localhost:8000/api/validate_login/?email=foo"))).toBeTruthy("email route wrong");
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://localhost:8000/api/validate_login"))).toBeTruthy("empty route wrong");
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://localhost:8000/api/validate"))).toBeFalsy("non-blocked shouldnt be");
        })();
    });

    it('should not blacklist some other routes', () => {
        inject([JwtInterceptor], (jwt) => {
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://localhost:8000/api/user"))).toBeFalsy();
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://localhost:8000/api/login"))).toBeFalsy();
            expect(jwt.isBlacklistedRoute(new HttpRequest("GET", "http://cunningplan.shinywhitebox.com/api/login"))).toBeFalsy();
        })();
    });

});