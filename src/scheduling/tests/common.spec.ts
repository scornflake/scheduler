import {GenericManager, NamedObject, SchedulerObjectStore} from "../common/scheduler-store";

describe('base', () => {
    let store, manager;

    class TestManager extends GenericManager<NamedObject> {

    }

    beforeEach(() => {
        store = new SchedulerObjectStore();
        manager = new TestManager(store, 'foo');
    });

    it('should add object and prevent duplicates', function () {
        expect(store.items.length).toEqual(0);

        let new_object = new NamedObject("ra!");
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);
    });

    it('can remove objects', () => {
        let new_object = new NamedObject("raaaaa");
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);

        store.remove_object_from_array(new_object);
        expect(store.items.length).toEqual(0);
    });

});