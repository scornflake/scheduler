import {ConfigurationService} from "ionic-configuration-service";
import {LoggingService} from "ionic-logging-service";
import {StateProvider} from "../providers/state/state";
import {EndpointsProvider} from "../providers/endpoints/endpoints";

export function doAppInitializersDeterministic(config: ConfigurationService,
                                               logging: LoggingService,
                                               state: StateProvider,
                                               endpoints: EndpointsProvider) {
    return async () => {
        console.log(`Loading settings...`);
        await config.load("assets/settings.json");

        logging.configure();

        console.log(`Validating endpoints...`);
        await endpoints.validateConfiguration();

        console.log(`Loading saved state...`);
        return state.asyncLoadState();
    };
}

/*


why it fails:
- In general, because there's a race between constructors and APP_INITIALIZERs
- cos the App isn't initialized yet so the LogWrapper doesn't have an injector0, so it can't provide a logger.


- Is there a way to init Logging... once. Without using an AppInitializer?
- Logging needs the ConfigService.

So neither of these can be mentioned in an APP_INITIALIZER (Im guessing?)
Hmm. Nah. That just configures it. It shoudl be OK to get instances before config.

Prob is that LogWrapper, used in constructors, can be used BEFORE LogService.
Either: Use LogService in all constructors, or use LogWrapper and NEVER inject

 */