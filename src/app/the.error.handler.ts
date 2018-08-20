import {SWBSafeJSON} from "../common/json/safe-stringify";
import {ErrorHandler} from "@angular/core";


class MyErrorHandler extends ErrorHandler {
    handleError(err: any): void {
        // do something with the error
        // super.handleError(err);
        console.error(`***** ${SWBSafeJSON.stringify(err)}`)
    }
}

export {
    MyErrorHandler
}

