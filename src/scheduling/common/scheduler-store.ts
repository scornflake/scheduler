import {find_object_with_name, GenericObjectStore} from "./base_model";
import {Organization} from "../organization";
import {Team} from "../teams";
import {Person} from "../people";
import {Plan} from "../plan";
import {Role} from "../role";
import {AssignedToRoleCondition} from "../rule_based/rules";
import {NamedObject, ObjectWithUUID} from "../base-types";

abstract class GenericManager<T extends NamedObject> {
    protected store: GenericObjectStore<T>;
    private type: string;

    constructor(store: GenericObjectStore<T>, type: string) {
        this.store = store;
        this.type = type;
    }

    get all(): T[] {
        return this.findAllThisType();
    }

    get length(): number {
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
        return this.store.add_object_to_array(item);
    }
}

class RoleManager extends GenericManager<Role> {
    constructor(store) {
        super(store, 'Role');
    }

    get roles(): Array<Role> {
        return this.findAllThisType();
    }

    remove(role: Role) {
        // noinspection SuspiciousInstanceOfGuard
        if (this.store instanceof SchedulerObjectStore) {
            this.store.removeRoleFromStoreWithRefcheck(role);
            return;
        }
        throw new Error(`cannot call, the store isnt a SchedulerObjectStore`);
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

    remove(plan: Plan) {
        this.store.remove_object_from_array(plan);
    }
}

class SchedulerObjectStore extends GenericObjectStore<ObjectWithUUID> {
    private peopleManager: PeopleManager;
    private teamManager: TeamManager;
    private plansManager: PlansManager;
    private rolesManager: RoleManager;

    organization: Organization;

    constructor() {
        super();
        this.peopleManager = new PeopleManager(this);
        this.teamManager = new TeamManager(this);
        this.rolesManager = new RoleManager(this);
        this.plansManager = new PlansManager(this);
    }

    get people(): PeopleManager {
        return this.peopleManager;
    }

    get roles(): RoleManager {
        return this.rolesManager;
    }

    get teams(): TeamManager {
        return this.teamManager;
    }

    get plans(): PlansManager {
        return this.plansManager;
    }

    removeTeamFromStoreWithRefcheck(team: Team) {
        let msg = `Cannot delete team ${team.name}, `;
        this.plans.forEach(p => {
            if (p.team.uuid == team.uuid) {
                throw new Error(`${msg}it is used in plan: ${p.name}`);
            }
        });
        this.remove_object_from_array(team);
    }

    removeRoleFromStoreWithRefcheck(role: Role) {
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

        this.remove_object_from_array(role);
    }

    removePersonFromStoreWithRefcheck(person: Person) {
        let msg = `Cannot delete person ${person.name}, `;
        this.teams.forEach(t => {
            if (t.findPersonInTeam(person) != null) {
                throw new Error(`${msg}they are in team: ${t.name}`);
            }
        });
        this.remove_object_from_array(person);
    }
}

export {
    SchedulerObjectStore,
    PeopleManager,
    GenericManager,
    OrganizationManager,
    TeamManager
}