import {ObjectWithUUID} from "./common/base_model";
import {observable} from "mobx";

export class Role extends ObjectWithUUID {
    @observable name: string;
    @observable maximum_count: number;
    @observable layout_priority: number;

    constructor(name: string, priority: number = 0, max_in_role: number = 1) {
        super();
        this.name = name;
        this.maximum_count = max_in_role;
        this.layout_priority = priority;
    }

    valueOf() {
        return "[" + this.name + "]";
    }
}

