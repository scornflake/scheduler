import {Logger} from "ionic-logging-service";

class OrmUtils {
    constructor(private logger: Logger) {

    }

    gap(width: number): string {
        return " ".repeat(width * 4);
    }

    debug(message, nesting) {
        this.logger.debug(`${this.gap(nesting)}${message}`);
    }

    info(message, nesting) {
        this.logger.info(`${this.gap(nesting)}${message}`);
    }
}

export {
    OrmUtils
}