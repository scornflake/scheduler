import {find_object_with_name, GenericObjectStore} from "./base_model";
import {Organization} from "../organization";
import {Team} from "../teams";
import {Person} from "../people";
import {Plan} from "../plan";
import {Role} from "../role";
import {NamedObject, ObjectWithUUID} from "../base-types";
import {action, computed, observable} from "mobx-angular";

abstract class GenericManager<T extends NamedObject> {
    @observable protected store: GenericObjectStore<T>;
    private type: string;

    constructor(store: GenericObjectStore<T>, type: string) {
        this.store = store;
        this.type = type;
    }

    @computed get all(): T[] {
        return this.findAllThisType();
    }

    @computed get length(): number {
        return this.all.length;
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

    findOfThisTypeByUUID(uuid: string): T {
        return this.findAllThisType().find(p => p.uuid == uuid);
    }

    findThisTypeByName(name: string): T[] {
        return this.store.items.filter(item => item.type == this.type && item.name.toLowerCase() == name.toLowerCase())
    }

    firstThisTypeByName(name: string, throwOnNotFound: boolean = true): T {
        let res = this.findThisTypeByName(name);
        if (res == null && throwOnNotFound) {
            throw new Error(`Unable to find ${this.type} with name ${name}`);
        }
        if (res.length > 1 && throwOnNotFound) {
            throw new Error(`Found ${res.length} of ${this.type} with name ${name}. Expected only single object.`);
        }
        return res[0];
    }

    @action add(item: T): T {
        return this.store.addObjectToStore(item);
    }

    @action addAll(objects: T[]) {
        return this.store.add_objects_to_array(objects);
    }
}

class RoleManager extends GenericManager<Role> {
    constructor(store) {
        super(store, 'Role');
    }

    @computed get roles(): Array<Role> {
        return this.findAllThisType();
    }

    @action remove(role: Role) {
        // noinspection SuspiciousInstanceOfGuard
        if (this.store instanceof SchedulerObjectStore) {
            this.store.removeRoleFromStoreWithRefcheck(role);
            return;
        }
        throw new Error(`cannot call, the store isnt a SchedulerObjectStore`);
    }
}

class PersonManager extends GenericManager<Person> {
    constructor(store) {
        super(store, 'Person');
    }

    get people(): Array<Person> {
        return this.findAllThisType();
    }

    findByNameFuzzy(name: string) {
        return find_object_with_name(this.people, name, true);
    }

    findByEmail(email: string) {
        return this.people.find(p => p.email == email);
    }

    remove(person: Person) {
        // noinspection SuspiciousInstanceOfGuard
        if (this.store instanceof SchedulerObjectStore) {
            this.store.removePersonFromStoreWithRefcheck(person);
            return;
        }
        throw new Error(`cannot call, the store isnt a SchedulerObjectStore`);
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
        // noinspection SuspiciousInstanceOfGuard
        if (this.store instanceof SchedulerObjectStore) {
            this.store.removeTeamFromStoreWithRefcheck(team);
            return;
        }
        throw new Error(`cannot call, the store isnt a SchedulerObjectStore`);
    }
}

class PlansManager extends GenericManager<Plan> {
    constructor(store) {
        super(store, 'Plan');
    }

    get plans(): Array<Plan> {
        return this.findAllThisType();
    }

    get plansByDateLatestFirst(): Array<Plan> {
        return this.plans.sort(((a, b) => {
            if (a.start_date > b.start_date) {
                return -1;
            } else if (a.start_date < b.start_date) {
                return 1;
            }
            return 0;
        }))
    }

    remove(plan: Plan) {
        // noinspection SuspiciousInstanceOfGuard
        if (this.store instanceof SchedulerObjectStore) {
            this.store.removePlanFromStoreWithRefcheck(plan);
            return;
        }
        throw new Error(`cannot call, the store isnt a SchedulerObjectStore`);
    }
}

class SchedulerObjectStore extends GenericObjectStore<ObjectWithUUID> {
    private peopleManager: PersonManager;
    private teamManager: TeamManager;
    private plansManager: PlansManager;
    private rolesManager: RoleManager;
    private organizationManager: OrganizationManager;

    constructor() {
        super();
        this.peopleManager = new PersonManager(this);
        this.teamManager = new TeamManager(this);
        this.rolesManager = new RoleManager(this);
        this.plansManager = new PlansManager(this);
        this.organizationManager = new OrganizationManager(this);
    }

    @computed get organizations(): OrganizationManager {
        return this.organizationManager;
    }

    @computed get people(): PersonManager {
        return this.peopleManager;
    }

    @computed get roles(): RoleManager {
        return this.rolesManager;
    }

    @computed get teams(): TeamManager {
        return this.teamManager;
    }

    @computed get plans(): PlansManager {
        return this.plansManager;
    }

    removeTeamFromStoreWithRefcheck(team: Team) {
        let msg = `Cannot delete team ${team.name}, `;
        this.plans.forEach(p => {
            if (p.team.uuid == team.uuid) {
                throw new Error(`${msg}it is used in plan: ${p.name}`);
            }
        });
        this.removeObjectFromStore(team);
    }

    removePlanFromStoreWithRefcheck(plan: Plan) {
        this.removeObjectFromStore(plan);
    }

    @action removeRoleFromStoreWithRefcheck(role: Role) {
        let msg = `Cannot delete role ${role.name}, `;

        // can't be used in role
        this.plans.forEach(p => {
            // Roles
            if (p.roles.indexOf(role) != -1) {
                throw new Error(`${msg}it is used in plan: ${p.name}`);
            }

            // Weighted roles per assignment
            let assignmentsWithRole = p.assignments_with_role(role);
            if (assignmentsWithRole.length > 0) {
                throw new Error(`${msg}it is used in plan: ${p.name} (assignments)`);
            }

            // Pick rules (OnThisDate)
            if (p.rules_for_role(role).length > 0) {
                throw new Error(`${msg}it is used in plan: ${p.name} (pick rules)`);
            }

            // check condtional
            p.assignments.forEach(a => {
                a.conditional_rules.forEach(cr => {
                    if (cr['role']) {
                        if (cr['role'].uuid == role.uuid) {
                            throw new Error(`${msg}it is used in plan: ${p.name}  (conditions)`);
                        }
                    }
                    if (cr['actions']) {
                        // check for actions containing the role
                        let actions = cr['actions'];
                        actions.forEach(a => {
                            console.log(`check action: ${a}`);
                            if (a['role']) {
                                if (a['role'].uuid == role.uuid) {
                                    throw new Error(`${msg}it is used in plan: ${p.name}  (actions)`);
                                }
                            }
                        })
                    }
                })
            })
        });

        this.removeObjectFromStore(role);
    }

    removePersonFromStoreWithRefcheck(person: Person) {
        let msg = `Cannot delete person ${person.name}, `;
        this.teams.forEach(t => {
            if (t.findPersonInTeam(person) != null) {
                throw new Error(`${msg}they are in team: ${t.name}`);
            }
        });
        this.removeObjectFromStore(person);
    }
}

export {
    SchedulerObjectStore,
    PersonManager,
    GenericManager,
    OrganizationManager,
    TeamManager
}