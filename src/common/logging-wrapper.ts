import {AppModule} from "../app/app.module";
import {Logger, LoggingService} from "ionic-logging-service";
import {MockConfigurationService} from "../tests/mock-logging-configuration";

export class LoggingWrapper {
    private static loggerMap: Map<string, Logger>;

    private static getLoggingService(): LoggingService {
        if (AppModule) {
            if (AppModule.injector) {
                return AppModule.injector.get(LoggingService, null);
            }
        }
        return null;
    }


    public static debug(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName)) {
            this.getLogger(loggerName).debug(methodName, params);
        }
    }

    public static info(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName)) {
            this.getLogger(loggerName).info(methodName, params);
        }
    }

    public static warn(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName)) {
            this.getLogger(loggerName).warn(methodName, params);
        }
    }

    public static error(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName)) {
            this.getLogger(loggerName).error(methodName, params);
        }
    }

    static getLogger(name: string): Logger {
        if (LoggingWrapper.loggerMap == null) {
            LoggingWrapper.loggerMap = new Map<string, Logger>();
        }
        if (LoggingWrapper.loggerMap.has(name)) {
            return LoggingWrapper.loggerMap.get(name);
        }

        let svc = LoggingWrapper.getLoggingService();
        if (svc) {
            let logger = svc.getLogger(name);
            LoggingWrapper.loggerMap.set(name, logger);
        }
        return null;
    }
}
