import {Team} from "../teams";
import {Service} from "../service";
import {Role} from "../role";

describe('roles', () => {
    let team: Team;
    let service: Service;

    beforeEach(() => {
        team = new Team("Fooooski");
        service = new Service("Test", team);
    });

    it('adding assigns a new uuid', () => {
        let r = service.add_role(new Role("Foo"));
        expect(service.roles).toContain(r);
        expect(r.uuid).not.toBe("0");
    });

    it('can call role.find with undefined', () => {
        let r = service.find_role(null);
        expect(r).toBeNull();
    });

    it('can add to roles', () => {
        let r = service.add_role(new Role("Test2", 1, 1, 44));
        expect(service.roles).toContain(r);
    });

    it('can update role, uuid is never changed', () => {
        let r: Role = service.add_role(new Role("Foo"));

        // While its possible to update the UUID, that's what is used to find the role, so it'll actually fail.

        r.name = "Neilos";
        let in_store_role = service.roles[0];
        expect(in_store_role.name).toEqual("Neilos");
    });

    it('cannot add a role twice', () => {
        let r = service.add_role(new Role("Foo"));
        expect(r).not.toBeNull();
        expect(service.roles.length).toEqual(1);

        let r2 = service.add_role(new Role("Foo"));
        expect(r2).toBeNull("didn't expect to be able to add this 2nd element");

        expect(service.roles.length).toEqual(1);
    });

    it('can remove role by uuid', () => {
        let r = service.add_role(new Role("Foo"));
        let r2 = service.add_role(new Role("Bar"));
        let r3 = service.add_role(new Role("Scud"));
        expect(service.roles.length).toEqual(3);

        service.remove_role(r);
        expect(service.roles.length).toEqual(2);

        let index = service.roles.findIndex(v => {
            return v.name == "Scud";
        });
        expect(index).toEqual(1);
    });

});