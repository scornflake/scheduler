import {observable} from "mobx-angular";
import {Person} from "./people";

class UIStore {
    @observable selected_person: Person;

    constructor() {
    }

    get have_selection(): boolean {
        return this.selected_person != null;
    }

}

export {
    UIStore
}