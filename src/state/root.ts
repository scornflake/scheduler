import {PeopleStore} from "./people";
import {RolesStore} from "./roles";
import {UIStore} from "./UIState";
import {Injectable} from "@angular/core";
import {TestStoreConstruction} from "../providers/store/test.store";
import {autorunAsync, IReactionDisposer} from "mobx";
import {ScheduleInput} from "../scheduling/common";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {Organization, OrganizationStore} from "./organization";
import {action, observable} from "mobx-angular";

@Injectable()
class RootStore {
    @observable people_store: PeopleStore;
    @observable roles_store: RolesStore;
    @observable organization_store: OrganizationStore;
    @observable ui_store: UIStore;

    @observable schedule: ScheduleWithRules;
    private regenerator: IReactionDisposer;

    constructor() {
        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        this.organization_store = new OrganizationStore();
        this.ui_store = new UIStore();

        TestStoreConstruction.SetupStore(this);

        this.regenerator = autorunAsync(() => {
            console.log("Generate schedule...");
            this.generate_schedule();
        });
    }

    @action
    generate_schedule(): ScheduleWithRules {
        // for testing, create some fake
        let params = new ScheduleInput(this.people_store, this.roles_store);
        params.start_date = new Date(2018, 0, 7);
        params.end_date = new Date(2018, 4, 1);

        if (!this.schedule) {
            this.schedule = new ScheduleWithRules(params);
        }
        this.schedule.create_schedule();
        return this.schedule;
    }
}

export {RootStore}