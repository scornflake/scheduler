import {Role} from "../role";
import {RolesStore} from "./role-store";

describe('roles', () => {
    let role_store: RolesStore;

    beforeEach(() => {
        role_store = new RolesStore();
        role_store.removeAllRoles();
    });

    it('adding assigns a new uuid', () => {
        let r = role_store.addRole(new Role("Foo"));
        expect(role_store.roles).toContain(r);
        expect(r.uuid).not.toBe("0");
    });

    it('can call role.find with undefined', () => {
        let r = role_store.find_role(null);
        expect(r).toBeNull();
    });

    it('can add to roles', () => {
        let r = role_store.addRole(new Role("Foo", 44));
        expect(role_store.roles).toContain(r);
    });

    it('can update role, uuid is never changed', () => {
        let r: Role = role_store.addRole(new Role("Foo"));

        // While its possible to update the UUID, that's what is used to find the role, so it'll actually fail.

        r.name = "Neilos";
        let in_store_role = role_store.roles[0];
        expect(in_store_role.name).toEqual("Neilos");
    });

    it('cannot add a role twice', () => {
        let r = role_store.addRole(new Role("Foo"));
        expect(r).not.toBeNull();
        expect(role_store.roles.length).toEqual(1);

        let r2 = role_store.addRole(r);
        expect(r2).toBeNull("didn't expect to be able to add this 2nd element");

        expect(role_store.roles.length).toEqual(1);
    });

    it('can remove role by uuid', () => {
        let r = role_store.addRole(new Role("Foo"));
        let r2 = role_store.addRole(new Role("Bar"));
        let r3 = role_store.addRole(new Role("Scud"));
        expect(role_store.roles.length).toEqual(3);

        role_store.removeRole(r);
        expect(role_store.roles.length).toEqual(2);

        let index = role_store.findIndex(v => {
            return v.name == "Scud";
        });
        expect(index).toEqual(1);
    });

});