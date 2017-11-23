import {observable} from "mobx-angular";
import ShortUniqueId from 'short-unique-id';

export class Role {
    @observable uuid: string;
    @observable name: string;
    @observable layout_priority: number;

    constructor(name: string, uuid: string = null, priority = 0) {
        if (uuid == null) {
            let uuid_gen = new ShortUniqueId();
            uuid = uuid_gen.randomUUID(8);
        }
        this.uuid = uuid;
        this.name = name;
        this.layout_priority = priority;
    }
}

let defaultMusicianRole = new Role("Musician", null, 1);
let defaultLeaderRole = new Role("Worship Leader", null, 10);
let defaultSoundRole = new Role("Sound", null);
let defaultDrumsRole = new Role("Drums", null, 8);
let defaultVocalsRole = new Role("Vocals", null, 7);
let defaultComputerRole = new Role("Computer", null);


export class RolesStore {
    @observable roles: Array<Role>;

    constructor() {
        this.roles = [
            defaultLeaderRole,
            defaultMusicianRole,
            defaultSoundRole,
            defaultDrumsRole,
            defaultVocalsRole,
            defaultComputerRole
        ];
    }

    removeAllRoles() {
        this.roles = [];
    }

    addRole(r: Role) {
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

    removeRole(r: Role) {
        this.roles = this.roles.filter(role => role.uuid != r.uuid);
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

