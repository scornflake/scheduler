import {Injectable} from '@angular/core';
import {ScheduleByExclusion, ScheduleInput} from "../../scheduling/scheduler";
import {StoreProvider} from "../store/store";
import {UIStore} from "../../state/UIState";

@Injectable()
export class ScheduleCreatorProvider {
    constructor(private store: StoreProvider) {
    }

    get_new_schedule() {
        let params = new ScheduleInput(this.store.person_store, this.store.role_store);
        params.start_date = new Date(2017, 12, 31);
        params.end_date = new Date(2018, 4, 1);

        let ui: UIStore = this.store.ui_store;
        ui.schedule = new ScheduleByExclusion(params);
        ui.schedule.create_schedule();
    }
}