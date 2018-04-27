const stringify = require('json-stringify-safe');

export class SafeJSON {
    public static stringify(thing: any) {
        return stringify(thing);
    }
}
