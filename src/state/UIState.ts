import {observable} from "mobx-angular";
import {Person} from "./people";
import {ScheduleByExclusion} from "../scheduling/scheduler";

class UIStore {
    @observable selected_person: Person;
    @observable schedule: ScheduleByExclusion;

    get have_selection() :boolean {
        return this.selected_person != null;
    }
}

export {
    UIStore
}