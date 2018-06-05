import {AppModule} from "../app/app.module";
import {Logger, LoggingService} from "ionic-logging-service";
import {MockConfigurationService} from "../app/logging-configuration";

export class LoggingWrapper {
    static loggingService: LoggingService;

    static getLogger(name: string): Logger {
        if (AppModule) {
            if (AppModule.injector) {
                return AppModule.injector.get(LoggingService).getLogger(name);
            }
        }
        if (!this.loggingService) {
            let mock_config = MockConfigurationService.ServiceForTests();
            this.loggingService = new LoggingService(mock_config);
        }
        return this.loggingService.getLogger(name);
    }
}
