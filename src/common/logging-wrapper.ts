import {AppModule} from "../app/app.module";
import {Logger, LoggingService, LogLevel} from "ionic-logging-service";

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


    public static setLogLevel(loggerName: string, logLevel: LogLevel, optionalMessage: string = null): LogLevel {
        if (logLevel == -1) {
            return -1;
        }
        let logger = this.getLogger(loggerName);
        if (logger) {
            let current = logger.getLogLevel();
            if (current != logLevel) {
                logger.setLogLevel(logLevel);
                if (optionalMessage) {
                    logger.warn(optionalMessage);
                } else {
                    console.warn(`Set ${loggerName} to level ${logLevel}`);
                }

                if (logger.getLogLevel() != logLevel) {
                    console.error(`Failed to set log level of ${loggerName} to ${logLevel}`);
                }
            }
            return current;
        } else {
            console.warn(`Cannot set ${loggerName} to ${logLevel} - no logger with this name`);
        }
        return -1;
    }

    public static debug(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName) != null) {
            this.getLogger(loggerName).debug(methodName, params);
        }
    }

    public static info(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName) != null) {
            this.getLogger(loggerName).info(methodName, params);
        }
    }

    public static warn(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName) != null) {
            this.getLogger(loggerName).warn(methodName, params);
        }
    }

    public static error(loggerName: string, methodName: string, ...params: any[]): void {
        if (this.getLogger(loggerName) != null) {
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
            if (logger) {
                LoggingWrapper.loggerMap.set(name, logger);
                // console.info(`Found logger for ${name}, ${logger.getInternalLogger().getLevel()}`);
            } else {
                console.warn(`No logger returned for name: ${name}, even though we have a service`);
            }
        } else {
            console.warn(`No logging service, trying to get: ${name}`);
        }
        return null;
    }
}
