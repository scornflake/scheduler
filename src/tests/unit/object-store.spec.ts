import {SchedulerObjectStore} from "../../scheduling/common/scheduler-store";
import {Person} from "../../scheduling/people";

describe('object store', () => {
    let store;
    beforeEach(() => {
        store = new SchedulerObjectStore();
    });

    it('can store people', () => {
        let p = new Person("Neil");
        store.add_object_to_array(p);
        expect(store.find(o => o.name == "Neil")).toEqual(p);
    });
});