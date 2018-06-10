import {ConfigurationService} from "ionic-configuration-service";

export function loadConfiguration(configurationService: ConfigurationService): () => Promise<void> {
    return () => configurationService.load("assets/settings.json");
}



/*
Note: had to completely override the class since it doesn't have a setter for the values, and it's private.
 */
class MockConfigurationService extends ConfigurationService {
    private mocked_configValues: { [key: string]: any };
    private static __service: MockConfigurationService;

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
        this.mocked_configValues = vars;
    }

    static Service(): MockConfigurationService {
        if (!this.__service) {
            this.__service = new MockConfigurationService(null);
        }
        return this.__service;
    }

    static ServiceForTests(): MockConfigurationService {
        let config = this.Service();
        config.setVars(this.test_configuration());
        return config;
    }

    static test_configuration() {
        return {
            "database": {
                "name": "tests"
            },
            "logging": {
                "logLevels": [
                    {
                        "loggerName": "root",
                        "logLevel": "DEBUG"
                    }
                ]
            }
        };
    }
}


export {
    MockConfigurationService
}