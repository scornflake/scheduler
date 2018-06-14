import {ObjectWithUUID} from "../../scheduling/base-types";
import {observe} from "mobx";
import {observable} from "mobx-angular";

class SomeThing extends ObjectWithUUID {
    @observable some_field: string = "a value";

    toString() {
        return this.some_field;
    }
}

describe('observation', () => {
    it('can observe property on class', (done) => {
        let instance = new SomeThing();

        observe(instance, 'some_field', (change) => {
            console.log(`Yup! it changed, ${JSON.stringify(change)}`);
            done();
        });

        // change the object
        instance.some_field = '1234';
    });
});