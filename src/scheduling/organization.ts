import {BaseStore, ObjectWithUUID} from "./common/base_model";
import {action, observable} from "mobx";
import {PeopleStore} from "./people";
import {RolesStore} from "./tests/role-store";
import {Logger} from "ionic-logging-service";
import {NPBCStoreConstruction} from "../providers/store/test.store";
import {ScheduleWithRules} from "./rule_based/scheduler";
import {csd} from "./common/date-utils";
import {ScheduleInput} from "./shared";
import {ApplicationRef} from "@angular/core";
import {LoggingWrapper} from "../common/logging-wrapper";
import {EventStore, Service} from "./service";

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

    @observable schedule: ScheduleWithRules;
    @observable previous_schedule: ScheduleWithRules;

    draft_service: Service;

    private logger: Logger;

    constructor(private appRef: ApplicationRef) {
        super();

        this.people_store = new PeopleStore();
        this.roles_store = new RolesStore();
        NPBCStoreConstruction.SetupRoles(this.roles_store);
        NPBCStoreConstruction.SetupPeople(this.people_store);

        this.event_store = new EventStore();
        this.draft_service = this.event_store.add_event_named("Draft Service");

        this.logger = LoggingWrapper.getLogger("google");

        NPBCStoreConstruction.SetupStore(this.people_store, this, this.draft_service);
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
        // for testing, create some fake
        let params = new ScheduleInput(this.draft_service);
        params.start_date = csd(2018, 6, 3);
        params.end_date = csd(2018, 9, 30);

        this.schedule = new ScheduleWithRules(params, this.previous_schedule);
        this.schedule.create_schedule();

        this.appRef.tick();
        return this.schedule;
    }

    set_previous_schedule(schedule: ScheduleWithRules) {
        this.previous_schedule = schedule;
        this.schedule = null;
        // this.generate_schedule();
    }

    add_service(service_name: string) {
        return this.event_store.add_event_named(service_name);
    }
}

export {
    Organization,
    OrganizationStore
}