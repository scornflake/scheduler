import {NamedObject} from "./common/scheduler-store";
import {registerFactory} from "../providers/server/db-decorators";

@registerFactory
class Organization extends NamedObject {
    constructor(name: string) {
        super(name);
    }
}

export {
    Organization,
}