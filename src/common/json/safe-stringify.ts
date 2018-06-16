import {isUndefined} from "util";

const stringify = require('json-stringify-safe');

export class SafeJSON {
    public static stringify(thing: any) {
        if (isUndefined(thing)) {
            return "undefined";
        }
        return stringify(thing);
    }
}
