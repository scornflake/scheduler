import {IAllPersons, IPerson, peopleReducer} from "./people";
import {PersonActions} from "../actions/person";
import {MockNgRedux} from "@angular-redux/store/lib/testing";
import {IRole, roleReducer} from "./roles";
import {RoleActions} from "../actions/roles";

describe('roles', () => {
    let state: IRole[] = [];

    beforeEach(() => {
        state = [];
    });

    it('adding assigns a new uuid', () => {
        let role = {
            uuid: "0",
            name: "Foo"
        };
        let action = RoleActions.addRole(role);
        let actual = roleReducer(state, action);
        expect(actual).toContain(role);
        expect(actual[0].uuid).not.toBe("0");
    });

    it('can add to roles', () => {
        let role = {
            uuid: "44",
            name: "Foo"
        };
        let action = RoleActions.addRole(role);
        let actual = roleReducer(state, action);
        expect(actual).toContain(role);
    });

    it('can update role, uuid is never changed', () => {
        let role = {uuid: "44", name: "Foo"};
        let action = RoleActions.addRole(role);
        state = roleReducer(state, action);

        // While its possible to update the UUID, that's what is used to find the role, so it'll actually fail.

        role.name = "Neilos";
        state = roleReducer(state, RoleActions.updateRole(role));
        let current = state[0];
        expect(current.name).toEqual("Neilos");
    });

    it('cannot add a role twice', () => {
        let role = {uuid: "44", name: "Foo"};
        state = roleReducer(state, RoleActions.addRole(role));
        role = {uuid: "44", name: "Foo"};
        state = roleReducer(state, RoleActions.addRole(role));
        expect(state).toBeArrayOfSize(1);
    });

    it('can remove role by uuid', () => {
        state = roleReducer(state, RoleActions.addRole({uuid: "44", name: "Foo"}));
        state = roleReducer(state, RoleActions.addRole({uuid: "45", name: "Bar"}));
        state = roleReducer(state, RoleActions.addRole({uuid: "46", name: "Scud"}));
        expect(state).toBeArrayOfSize(3);

        state = roleReducer(state, RoleActions.removeRole("44"));
        expect(state).toBeArrayOfSize(2);

        let index = Array.from(state).findIndex(v => {
            return v.name == "Scud";
        });
        expect(index).toEqual(1);
    })
});