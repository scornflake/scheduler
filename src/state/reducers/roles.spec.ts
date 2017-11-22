import {Role, RolesStore} from "./roles";

describe('roles', () => {
    let role_store: RolesStore;

    beforeEach(() => {
        role_store = new RolesStore();
    });

    it('adding assigns a new uuid', () => {
        let r = role_store.addRole(new Role("Foo"));
        expect(role_store.roles).toContain(r);
        expect(r.uuid).not.toBe("0");
    });

    it('can add to roles', () => {
        let r = role_store.addRole(new Role("Foo", "44"));
        expect(role_store.roles).toContain(r);
    });

    it('can update role, uuid is never changed', () => {
        let r = role_store.addRole(new Role("Foo", "44"));

        // While its possible to update the UUID, that's what is used to find the role, so it'll actually fail.

        r.name = "Neilos";
        let in_store_role = role_store.roles[0];
        expect(in_store_role.name).toEqual("Neilos");
    });

    it('cannot add a role twice', () => {
        let r = role_store.addRole(new Role("Foo", "44"));
        expect(r).not.toBeNull();
        expect(role_store.roles.length).toEqual(1);

        let r2 = role_store.addRole(new Role("Foo", "44"));
        expect(r2).toBeNull("didn't expect to be able to add this 2nd element");

        expect(role_store.roles.length).toEqual(1);
    });

    it('can remove role by uuid', () => {
        let r = role_store.addRole(new Role("Foo", "44"));
        let r2 = role_store.addRole(new Role("Bar", "45"));
        let r3 = role_store.addRole(new Role("Scud", "46"));
        expect(role_store.roles.length).toEqual(3);

        role_store.removeRole(r);
        expect(role_store.roles.length).toEqual(2);

        let index = Array.from(role_store.roles).findIndex(v => {
            return v.name == "Scud";
        });
        expect(index).toEqual(1);
    });

    it('can return roles sorted by layout order', () => {
        let r = role_store.addRole(new Role("Foo", "44"));
        let r2 = role_store.addRole(new Role("Bar", "45"));

        r.layout_priority = 1;
        r2.layout_priority = 3;

        // Highest first
        let sorted = role_store.rolesInLayoutOrder;
        expect(sorted[0]).toEqual(r2);
        expect(sorted[1]).toEqual(r);
    });
});