import {observable} from "mobx-angular";
import {Person} from "./people";

class UIStore {
    @observable selected_person: Person;
}

export {
    UIStore
}