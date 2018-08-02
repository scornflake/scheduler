import {LoggingService} from "ionic-logging-service";
import * as log4javascript from "log4javascript";
import {MockConfigurationService} from "../mock-logging-configuration";

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