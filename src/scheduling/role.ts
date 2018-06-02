import {ObjectWithUUID} from "./common/base_model";

class Role extends ObjectWithUUID {
    name: string;

    minimum_needed: number;
    maximum_wanted: number;
    layout_priority: number;
    display_order: number;

    constructor(name: string, min_required: number = 1, maximum = 1, layout_priority = 1) {
        super();
        this.name = name;
        this.minimum_needed = min_required;
        this.maximum_wanted = maximum;
        this.layout_priority = layout_priority;
        this.display_order = layout_priority;
    }

    get required(): boolean {
        return this.minimum_needed > 1;
    }

    valueOf() {
        return this.name;
    }

    toString() {
        return this.valueOf();
    }
}


export {Role};