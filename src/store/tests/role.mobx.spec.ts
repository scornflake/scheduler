import {Role} from "../../scheduling/role";

describe('role mobx tests', () => {
    it('should be observable', function (done) {
        let role = new Role("A role");
        let changed = false;

        mobx.autorun(() => {
            console.log("Role name: " + role.name);
            changed = true;
            done();
        });

        role.name = "A different role";
        expect(changed).toBeTruthy();
    });
});