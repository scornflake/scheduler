import {NamedObject} from "./base-types";

class Organization extends NamedObject {
    constructor(name: string) {
        super(name);
    }
}

export {
    Organization,
}