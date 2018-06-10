import {NamedObject} from "./common/scheduler-store";

class Organization extends NamedObject {
    constructor(name: string) {
        super(name);
    }
}

export {
    Organization,
}