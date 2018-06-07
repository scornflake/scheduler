import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {action, observable} from "mobx-angular";
import {PeopleStore} from "./people-store";
import {ScheduleWithRules} from "./rule_based/scheduler";
import {ApplicationRef} from "@angular/core";
import {Plan, PlansStore} from "./plan";
import {TeamsStore} from "./teams-store";

class Organization extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }
}

class OrganizationStore extends BaseStore<Organization> {
    @observable people_store: PeopleStore;
    @observable plans_store: PlansStore;
    @observable teams_store: TeamsStore;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    draft_service: Plan;

    constructor(private appRef: ApplicationRef) {
        super();

        this.people_store = new PeopleStore();
        this.plans_store = new PlansStore();
        this.teams_store = new TeamsStore();
    }

    @action add_organisation(org: Organization) {
        this.add_object_to_array(org);
    }

    @action removeOrganization(org: Organization) {
        this.remove_object_from_array(org);
    }

    @action
    generate_schedule(): ScheduleWithRules {
        this.schedule = new ScheduleWithRules(this.draft_service, this.previous_schedule);
        this.schedule.create_schedule();
        this.appRef.tick();
        return this.schedule;
    }

    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
        this.schedule = null;
        // this.generate_schedule();
    }
}

export {
    Organization,
    OrganizationStore
}