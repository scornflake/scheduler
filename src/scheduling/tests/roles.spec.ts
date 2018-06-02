import {Team} from "../teams";
import {Plan} from "../plan";
import {Role} from "../role";

describe('roles', () => {
    let team: Team;
    let plan: Plan;

    beforeEach(() => {
        team = new Team("Fooooski");
        plan = new Plan("Test", team);
    });

    it('adding assigns a new uuid', () => {
        let r = plan.add_role(new Role("Foo"));
        expect(plan.roles).toContain(r);
        expect(r.uuid).not.toBe("0");
    });

    it('can call role.find with undefined', () => {
        let r = plan.find_role(null);
        expect(r).toBeNull();
    });

    it('can add to roles', () => {
        let r = plan.add_role(new Role("Test2", 1, 1, 44));
        expect(plan.roles).toContain(r);
    });

    it('can update role, uuid is never changed', () => {
        let r: Role = plan.add_role(new Role("Foo"));

        // While its possible to update the UUID, that's what is used to find the role, so it'll actually fail.

        r.name = "Neilos";
        let in_store_role = plan.roles[0];
        expect(in_store_role.name).toEqual("Neilos");
    });

    it('cannot add a role twice', () => {
        let r = plan.add_role(new Role("Foo"));
        expect(r).not.toBeNull();
        expect(plan.roles.length).toEqual(1);

        let r2 = plan.add_role(new Role("Foo"));
        expect(r2).toBeNull("didn't expect to be able to add this 2nd element");

        expect(plan.roles.length).toEqual(1);
    });

    it('can remove role by uuid', () => {
        let r = plan.add_role(new Role("Foo"));
        let r2 = plan.add_role(new Role("Bar"));
        let r3 = plan.add_role(new Role("Scud"));
        expect(plan.roles.length).toEqual(3);

        plan.remove_role(r);
        expect(plan.roles.length).toEqual(2);

        let index = plan.roles.findIndex(v => {
            return v.name == "Scud";
        });
        expect(index).toEqual(1);
    });

});