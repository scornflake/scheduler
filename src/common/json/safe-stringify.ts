import {isUndefined} from "util";

const stringify = require('json-stringify-safe');

class SWBSafeJSON {
    public static stringify(thing: any) {
        if (isUndefined(thing)) {
            return "undefined";
        }
        if(typeof thing === 'string') {
            return thing;
        }
        return stringify(thing);
    }
}

export {
    SWBSafeJSON
}