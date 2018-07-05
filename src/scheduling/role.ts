import {NamedObject} from "./base-types";
import {action, observable} from "mobx-angular";

class Role extends NamedObject {
    @observable minimum_needed: number;
    @observable maximum_wanted: number;
    @observable layout_priority: number;
    @observable display_order: number;

    constructor(name: string, min_required: number = 1, maximum = 1, layout_priority = 1) {
        super();
        this.name = name;
        this.minimum_needed = min_required;
        this.maximum_wanted = maximum;
        this.layout_priority = layout_priority;
        this.display_order = layout_priority;
    }

    @action setLayoutPriority(val: number) {
        this.layout_priority = val;
    }

    @action setDisplayOrder(val: number) {
        this.display_order = val;
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