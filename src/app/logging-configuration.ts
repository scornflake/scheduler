import {ConfigurationService} from "ionic-configuration-service";

export function loadConfiguration(configurationService: ConfigurationService): () => Promise<void> {
    return () => configurationService.load("assets/settings.json");
}

/*
Note: had to completely override the class since it doesn't have a setter for the values, and it's private.
 */
class MockConfigurationService extends ConfigurationService {
    private mocked_configValues: { [key: string]: any };

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
    public setVars(vars:any) {
        this.mocked_configValues = vars;
    }
}


export {
    MockConfigurationService
}