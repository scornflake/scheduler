import {Injectable} from '@angular/core';
import {ScheduleByExclusion, ScheduleInput} from "../../scheduling/scheduler";
import {StoreProvider} from "../store/store";

@Injectable()
export class ScheduleCreatorProvider {
    schedule: ScheduleByExclusion;

    constructor(private store: StoreProvider) {
    }

    get_new_schedule(): ScheduleByExclusion {
        let params = new ScheduleInput(this.store.person_store, this.store.role_store);
        params.start_date = new Date(2017, 12, 31);
        params.end_date = new Date(2018, 4, 1);

        this.schedule = new ScheduleByExclusion(params);
        this.schedule.create_schedule();
        return this.schedule;
    }
}