import {observable} from "mobx-angular";

export class SchedulePrefs {
    @observable slip_aggressiveness: number;
    @observable fill_aggresiveness: number;

    constructor() {
        this.slip_aggressiveness = 0;
        this.fill_aggresiveness = 0;
    }
}

