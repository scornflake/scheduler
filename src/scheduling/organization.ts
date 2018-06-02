import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {action, observable} from "mobx";
import {PeopleStore} from "./people-store";
import {RolesStore} from "./role-store";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {ScheduleWithRules} from "./rule_based/scheduler";
import {csd} from "./common/date-utils";
import {ApplicationRef} from "@angular/core";
import {EventStore, Service} from "./service";
import {TeamsStore} from "./teams-store";
import {Team} from "./teams";

class Organization extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }
}

class OrganizationStore extends BaseStore<Organization> {
    @observable people_store: PeopleStore;
    @observable roles_store: RolesStore;
    @observable event_store: EventStore;
    @observable teams_store: TeamsStore;

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    draft_service: Service;

    constructor(private appRef: ApplicationRef) {
        super();

        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();

        NPBCStoreConstruction.SetupRoles(this.roles_store);
        NPBCStoreConstruction.SetupPeople(this.people_store);

        this.event_store = new EventStore();
        this.teams_store = new TeamsStore();

        this.addOrganizaton(new Organization("North Porirua Baptist Church"));

        // make up a default team
        let team = new Team("Default", this.people_store.people);

        // for testing, create some fake
        this.draft_service = this.event_store.add_event_named("Draft Service", team);
        this.draft_service.start_date = csd(2018, 6, 3);
        this.draft_service.end_date = csd(2018, 9, 30);


        NPBCStoreConstruction.SetupServiceRoles(this.draft_service);
        NPBCStoreConstruction.SetupService(this.draft_service, team);
        // ThamesTest.SetupStore(this);
    }

    @action addOrganizaton(org: Organization) {
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