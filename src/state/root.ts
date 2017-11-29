import {PeopleStore} from "./people";
import {RolesStore} from "./roles";
import {UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {TestStoreConstruction} from "../providers/store/test.store";
import {autorunAsync, IReactionDisposer} from "mobx";
import {ScheduleInput} from "../scheduling/common";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";

@Injectable()
class RootStore {
    people_store: PeopleStore;
    roles_store: RolesStore;
    ui_store: UIStore;

    private schedule: ScheduleWithRules;
    private regenerator: IReactionDisposer;

    constructor() {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.ui_store = new UIStore();

        TestStoreConstruction.SetupStore(this);

        this.regenerator = autorunAsync(() => {
            console.log("Generate schedule...");
            this.generate_schedule();

            // this.schedule.dates.forEach(sc => {
            //     console.log("" + sc);
            // });
        });
    }

    generate_schedule(): ScheduleWithRules {
        // for testing, create some fake
        let params = new ScheduleInput(this.people_store, this.roles_store);
        params.start_date = new Date(2018, 0, 7);
        params.end_date = new Date(2018, 0, 15);

        if (!this.schedule) {
            this.schedule = new ScheduleWithRules(params);
        }
        this.schedule.create_schedule();
        return this.schedule;
    }
}

export {RootStore}