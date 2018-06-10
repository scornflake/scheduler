import {find_object_with_name, GenericObjectStore, ObjectWithUUID} from "./base_model";
import {Organization} from "../organization";
import {observable} from "mobx-angular";
import {Team} from "../teams";
import {Person} from "../people";
import {Plan} from "../plan";

class NamedObject extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string = "") {
        super();
        this.name = name;
    }

    valueOf() {
        return this.name;
    }

    toString() {
        return this.valueOf();
    }

    static sortByName<T extends NamedObject>(list: Array<T>): Array<T> {
        return list.sort(((a, b) => {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        }));
    }
}

// class GenericManager<T extends NamedObject> implements Iterable<T> {
abstract class GenericManager<T extends NamedObject> {
    protected store: GenericObjectStore<T>;
    private type: string;

    constructor(store: GenericObjectStore<T>, type: string) {
        this.store = store;
        this.type = type;
    }

    // [Symbol.iterator](): Iterator<T> {
    //     return this.all[Symbol.iterator]();
    // }

    get all(): T[] {
        return this.findAllThisType();
    }

    get length(): number {
        return this.store.items.length;
    }

    forEach(callbackfn) {
        this.all.forEach(callbackfn);
    }

    map(callbackfn) {
        return this.all.map(callbackfn);
    }

    findAllThisType(): T[] {
        return this.store.items.filter(item => {
            return item.type == this.type;
        });
    }

    findThisTypeByName(name: string): T[] {
        return this.store.items.filter(item => item.type == this.type && item.name.toLowerCase() == name.toLowerCase())
    }

    firstThisTypeByName(name: string, exception_if_not_found: boolean = true): T {
        let res = this.findThisTypeByName(name);
        if (res == null && exception_if_not_found) {
            throw new Error(`Unable to find ${this.type} with name ${name}`);
        }
        if (res.length > 1 && exception_if_not_found) {
            throw new Error(`Found ${res.length} of ${this.type} with name ${name}. Expected only single object.`);
        }
        return res[0];
    }

    add(item: T): T {
        this.store.add_object_to_array(item);
        return item;
    }
}

class PeopleManager extends GenericManager<Person> {
    constructor(store) {
        super(store, 'Person');
    }

    get people(): Array<Person> {
        return this.findAllThisType();
    }

    findByNameFuzzy(name: string) {
        return find_object_with_name(this.people, name, true);
    }

    remove(person: Person) {
        this.store.remove_object_from_array(person);
    }
}

class OrganizationManager extends GenericManager<Organization> {
    constructor(store) {
        super(store, 'Organization');
    }

    get organizations(): Array<Organization> {
        return this.findAllThisType();
    }
}

class TeamManager extends GenericManager<Team> {
    constructor(store) {
        super(store, 'Team');
    }

    get teams(): Array<Team> {
        return this.findAllThisType();
    }

    remove(team: Team) {
        this.store.remove_object_from_array(team);
    }
}

class PlansManager extends GenericManager<Plan> {
    constructor(store) {
        super(store, 'Plan');
    }

    get plans(): Array<Plan> {
        return this.findAllThisType();
    }

    get plans_by_date_latest_first(): Array<Plan> {
        return this.plans.sort(((a, b) => {
            if (a.start_date > b.start_date) {
                return -1;
            } else if (a.start_date < b.start_date) {
                return 1;
            }
            return 0;
        }))
    }
}

class SchedulerObjectStore extends GenericObjectStore<ObjectWithUUID> {
    private peopleManager: PeopleManager;
    private teamManager: TeamManager;
    private plansManager: PlansManager;

    organization: Organization;

    constructor() {
        super();
        this.peopleManager = new PeopleManager(this);
        this.teamManager = new TeamManager(this);
        this.plansManager = new PlansManager(this);
    }

    get people(): PeopleManager {
        return this.peopleManager;
    }

    get teams(): TeamManager {
        return this.teamManager;
    }

    get plans(): PlansManager {
        return this.plansManager;
    }
}

export {
    SchedulerObjectStore,
    PeopleManager,
    GenericManager,
    OrganizationManager,
    TeamManager,
    NamedObject
}