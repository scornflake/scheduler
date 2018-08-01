import {ConfigurationService} from "ionic-configuration-service";
import {HttpClient} from "@angular/common/http";
import {Mock} from "protractor/built/driverProviders";
import {SWBSafeJSON} from "../common/json/safe-stringify";

export function loadConfiguration(configurationService: ConfigurationService): () => Promise<void> {
    return () => configurationService.load("assets/settings.json");
}


/*
Note: had to completely override the class since it doesn't have a setter for the values, and it's private.
 */
class MockConfigurationService extends ConfigurationService {
    private mocked_configValues: { [key: string]: any };
    private static __service: MockConfigurationService = null;

    static dbName: string = 'tests';

    constructor(httpClient: HttpClient) {
        super(httpClient);
        MockConfigurationService.__service = this;
        this.setVars(MockConfigurationService.test_configuration());
    }

    public getKeys(): string[] {
        const keys: string[] = [];
        // tslint:disable-next-line:forin
        for (const key in this.mocked_configValues) {
            keys.push(key);
        }
        return keys;
    }

    public getValue<T>(key: string): T {
        if (this.mocked_configValues) {
            return this.mocked_configValues[key];
        } else {
            return undefined;
        }
    }

    public setVars(vars: any) {
        // if (this.mocked_configValues == null && vars != null) {
        //     console.log(`Set mock service config to: ${SWBSafeJSON.stringify(vars)}`);
        // }
        this.mocked_configValues = vars;
    }

    static Service(config = null): MockConfigurationService {
        if (MockConfigurationService.__service == null) {
            MockConfigurationService.__service = new MockConfigurationService(null);
            if (config == null) {
                config = MockConfigurationService.test_configuration();
            }
            MockConfigurationService.__service.setVars(config);
        }
        return MockConfigurationService.__service;
    }

    static ServiceForTests(db_name: string = "tests"): MockConfigurationService {
        let config = this.Service();
        let configuration = this.test_configuration();
        configuration['database']['name'] = db_name;
        config.setVars(configuration);
        return config;
    }

    static test_configuration() {
        return {
            "database": {
                "name": "tests"
            },
            "server": {
                "couch": "http://localhost:5984",
                "rest": "http://localhost:8000"
            },
            "logging": {
                "logLevels": [
                    {
                        "loggerName": "root",
                        "logLevel": "DEBUG"
                    },
                    {
                        "loggerName": "db",
                        "logLevel": "INFO"
                    },
                    {
                        "loggerName": "orm",
                        "logLevel": "DEBUG"
                    },
                    {
                        "loggerName": "service.store",
                        "logLevel": "INFO"
                    },
                    {
                        "loggerName": "service.bridge",
                        "logLevel": "INFO"
                    },
                    {
                        "loggerName": "db.mapping",
                        "logLevel": "INFO"
                    },
                    {
                        "loggerName": "db.converter",
                        "logLevel": "INFO"
                    },
                    {
                        "loggerName": "db.tracking",
                        "logLevel": "DEBUG"
                    },
                ]
            }
        };
    }
}


export {
    MockConfigurationService
}