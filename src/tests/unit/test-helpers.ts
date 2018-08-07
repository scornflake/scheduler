import {LoggingService} from "ionic-logging-service";
import * as log4javascript from "log4javascript";
import {MockConfigurationService} from "../mock-logging-configuration";
import {TestBed} from "@angular/core/testing";
import {ApplicationInitStatus} from "@angular/core";
import {ConnectivityService} from "../../common/network/connectivity";
import {instance, mock} from "ts-mockito";

export let testOptionsFactory = (st) => {
    return {
        tokenGetter: () => {
            if(st === undefined) {
                console.error(`Could not give token: no 'st' was passed into testOptionsFactory. Check TestBed setup.`);
            }
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


/*
Use this like:
                {provide: LoggingService, useClass: MockLoggingService},

                or if you like the LONG way:
                {
                    provide: APP_INITIALIZER,
                    useFactory: reconfigureLoggingInitializer,
                    deps: [ConfigurationService],
                    multi: true
                },

    It resets all logging, assuming you're using TestBed within a beforeEach (not a beforeAll)
 */
export function resetLog4J() {
    log4javascript.getRootLogger().removeAllAppenders();
    log4javascript.resetConfiguration();
}

export function reconfigureLoggingInitializer(configSvc) {
    return () => {
        log4javascript.getRootLogger().removeAllAppenders();
        log4javascript.resetConfiguration();
        new LoggingService(configSvc);
    }
}

export function newLoggingServiceAfterReset(): LoggingService {
    log4javascript.getRootLogger().removeAllAppenders();
    log4javascript.resetConfiguration();
    return new LoggingService(new MockConfigurationService());
}

export async function waitForTestBedInitializers(): Promise<any> {
    //https://github.com/angular/angular/issues/24218
    // noinspection BadExpressionStatementJS
    return TestBed.get(ApplicationInitStatus).donePromise;
}

export class ConnectivityServiceMock {
    static _mock: ConnectivityService;
    static _instance: ConnectivityService;

    static factory() {
        ConnectivityServiceMock._mock = mock(ConnectivityService);
        ConnectivityServiceMock._instance = instance(ConnectivityServiceMock._mock);
        return ConnectivityServiceMock._instance;
    }

    static Provider() {
        return {provide: ConnectivityService, useFactory: () => ConnectivityServiceMock.factory};
    }
}

export class HttpFlush {
    static expiredTokenResponse(request) {
        request.flush({"detail": "Signature has expired."}, {
            status: 401,
            error: {
                message: "token expired"
            },
            statusText: 'Unauthorized'
        });
    }

    static userAccountInactive(request) {
        request.flush({"non_field_errors": ["User account is disabled."]}, {
            status: 400,
            statusText: 'Bad Request'
        });
    }
}