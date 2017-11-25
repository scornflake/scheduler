import {action, observable} from "mobx-angular";
import ShortUniqueId from 'short-unique-id';

export class Role {
    @observable uuid: string;
    @observable name: string;
    @observable maximum_count: number;
    @observable layout_priority: number;

    constructor(name: string, uuid: string = null, priority = 0) {
        if (uuid == null) {
            let uuid_gen = new ShortUniqueId();
            uuid = uuid_gen.randomUUID(8);
        }
        this.uuid = uuid;
        this.name = name;
        this.maximum_count = 1;
        this.layout_priority = priority;
    }
}

let leaderPriority = 11;
let soundPriority = 10; // 10
let instrumentPriority = 10;// 9

let defaultLeaderRole = new Role("Worship Leader", null, leaderPriority);

let defaultSoundRole = new Role("Sound", null, soundPriority);
let defaultComputerRole = new Role("Computer", null, soundPriority);

let defaultBass = new Role("Bass", null, instrumentPriority);
let defaultDrumsRole = new Role("Drums", null, instrumentPriority);
let defaultKeysRole = new Role("Keys", null, instrumentPriority);
let defaultAccousticGuitar = new Role("Guitar (Accoustic)", null, instrumentPriority);
let defaultElectricGuitar = new Role("Guitar (Electric)", null, instrumentPriority);

let defaultVocalsRole = new Role("Vocals", null, instrumentPriority);
let defaultSaxRole = new Role("Sax", null, instrumentPriority);


defaultLeaderRole.maximum_count = 1;
defaultSoundRole.maximum_count = 1;
defaultComputerRole.maximum_count = 1;
defaultKeysRole.maximum_count = 1;

defaultAccousticGuitar.maximum_count = 2;

defaultVocalsRole.maximum_count = 3;

defaultElectricGuitar.maximum_count = 1;
defaultBass.maximum_count = 1;
defaultDrumsRole.maximum_count = 1;

export class RolesStore {
    @observable roles: Array<Role>;

    constructor() {
        this.roles = [
            defaultLeaderRole,
            defaultSoundRole,
            defaultComputerRole,
            defaultKeysRole,
            defaultVocalsRole,
            defaultBass,
            defaultDrumsRole,
            defaultAccousticGuitar,
            defaultElectricGuitar,
            defaultSaxRole
        ];
    }

    @action removeAllRoles() {
        this.roles = [];
    }

    @action addRole(r: Role) {
        let foundIndex = this.roles.findIndex(role => {
            return r.uuid == role.uuid;
        });
        // console.log("Index of " + r.uuid + " is " + foundIndex);
        if (foundIndex >= 0) {
            return null;
        }

        this.roles.push(r);
        // console.log("Added role: " + JSON.stringify(r));
        return r;
    }

    @action removeRole(r: Role) {
        this.roles = this.roles.filter(role => role.uuid != r.uuid);
    }

    get roles_in_layout_order_grouped(): Array<Array<Role>> {
        // Add all roles into a map
        let roles_in_order = this.roles_in_layout_order;
        let intermediate = new Map<number, Array<Role>>();
        for(let role of roles_in_order) {
            if(!intermediate.has(role.layout_priority)) {
                intermediate.set(role.layout_priority, []);
            }
            intermediate.set(role.layout_priority, [...intermediate.get(role.layout_priority), role]);
        }

        // Turn into an array
        let result = [];
        intermediate.forEach((list, key:number) => {
            result.push(list);
        });
        return result;
    }

    get roles_in_layout_order(): Array<Role> {
        return this.roles.sort((a: Role, b: Role) => {
            if (a.layout_priority < b.layout_priority) {
                return 1;
            } else if (a.layout_priority > b.layout_priority) {
                return -1;
            }
            return 0;
        });
    }

    find_role(role_name: string) {
        for (let role of this.roles) {
            if (role.name.toLowerCase() == role_name.toLowerCase()) {
                return role;
            }
        }
        return null;
    }
}

export {
    defaultLeaderRole,
    defaultSoundRole,
    defaultDrumsRole,
    defaultVocalsRole,
    defaultComputerRole,
    defaultKeysRole,
    defaultAccousticGuitar,
    defaultElectricGuitar,
    defaultBass,
    defaultSaxRole
}