import {Platform} from "ionic-angular";
import {LoggingWrapper} from "./logging-wrapper";
import {Logger} from "ionic-logging-service";

type ContentFunction = () => any;

class WidthAwareValue {
    private widthFunctions = new Map<number, ContentFunction>();
    private logger: Logger;

    constructor(value: any = null) {
        this.logger = LoggingWrapper.getLogger('wav');
        if (value) {
            this.add(999999, () => value);
        }
    }

    add(upToWidth: number, func: ContentFunction) {
        this.widthFunctions.set(upToWidth, func);
        return this;
    }

    render(platform: Platform) {
        this.logger.info(`finding func for ${platform.width()}`);
        let func = this.findFuncForWidth(platform.width());
        if (func) {
            return func();
        }
        return null;
    }

    private findFuncForWidth(width: number): ContentFunction {
        let keys = Array.from(this.widthFunctions.keys()).sort((a, b) => {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        });

        this.logger.info(`Keys are: ${JSON.stringify(keys)}`);
        if(this.widthFunctions.size == 0) {
            return null;
        }
        if(this.widthFunctions.size == 1) {
            return this.widthFunctions.get(keys[0]);
        }

        // return the item to the right of the last
        for (let upToWidth of keys) {
            let func = this.widthFunctions.get(upToWidth);
            // find the one just after width < upToWidth
            if (upToWidth >= width) {
                this.logger.info(`return ${upToWidth} because  ${upToWidth} > ${width}`);
                return func;
            }
        }

        // No? Return the last one
        this.logger.info(`return last as its all we have`);
        return this.widthFunctions.get(keys[keys.length - 1]);
    }
}

export {
    WidthAwareValue
}