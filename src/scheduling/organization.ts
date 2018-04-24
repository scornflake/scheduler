import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {action, observable} from "mobx";

class Organization extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }
}

class OrganizationStore extends BaseStore<Organization> {
    constructor() {
        super();
    }

    @action addOrganizaton(org: Organization) {
        this.add_object_to_array(org);
    }

    @action removeOrganization(org:Organization) {
        this.remove_object_from_array(org);
    }
}

export {
    Organization,
    OrganizationStore
}