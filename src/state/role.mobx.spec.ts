import {Role} from "./roles";
import {autorun} from "mobx";

describe('role mobx tests', () => {
    it('should be observable', function (done) {
        let role = new Role("A role");
        let changed = false;

        autorun(() => {
            console.log("Role name: " + role.name);
            changed = true;
            done();
        });

        role.name = "A different role";
        expect(changed).toBeTruthy();
    });
});