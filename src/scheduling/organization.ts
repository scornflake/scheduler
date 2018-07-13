import {NamedObject} from "./base-types";

class Organization extends NamedObject {
    constructor(name: string) {
        super(name);
    }

    get dbName():string {
        return Organization.dbNameFor(this.uuid);
    }

    static dbNameFor(uuid:string) {
        return `org_${uuid}`;
    }
}

export {
    Organization,
}