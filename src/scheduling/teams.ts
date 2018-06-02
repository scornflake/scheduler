import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {observable} from "mobx";
import {Person} from "./people";

class Team extends ObjectWithUUID {
    @observable name: string;
    members: BaseStore<Person>;

    constructor(name: string, priority: number = 0, max_in_role: number = 1) {
        super();
        this.name = name;
        this.members = new BaseStore<Person>();
    }

    valueOf() {
        return this.name;
    }

    toString() {
        return this.valueOf();
    }
}


export {
    Team}