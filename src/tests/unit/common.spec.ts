import {GenericManager, SchedulerObjectStore} from "../../scheduling/common/scheduler-store";
import {NamedObject} from "../../scheduling/base-types";

describe('base', () => {
    let store, manager;

    class TestManager extends GenericManager<NamedObject> {

    }

    beforeEach(() => {
        store = new SchedulerObjectStore();
        manager = new TestManager(store, 'foo');
    });

    it('should add object and prevent duplicates', function () {
        console.log(`store has: ${JSON.stringify(store.items)}`);
        expect(store.items.length).toEqual(0);

        let new_object = new NamedObject("ra!");
        store.addObjectToStore(new_object);
        console.log(`store has #1: ${JSON.stringify(store.items)}`);
        expect(store.items.length).toEqual(1);

        store.addObjectToStore(new_object);
        expect(store.items.length).toEqual(1);
    });

    it('can remove objects', () => {
        let new_object = new NamedObject("raaaaa");
        store.addObjectToStore(new_object);
        console.log(`store has: ${JSON.stringify(store.items)}`);
        expect(store.items.length).toEqual(1);

        store.removeObjectFromStore(new_object);
        expect(store.items.length).toEqual(0);
        console.log(`store has #1: ${JSON.stringify(store.items)}`);
    });


});