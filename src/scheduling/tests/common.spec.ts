import {BaseStore, ObjectWithUUID} from "../common/base_model";

describe('base', () => {
    let store;

    beforeEach(() => {
        store = new BaseStore<ObjectWithUUID>();
    });

    it('should add object and prevent duplicates', function () {
        expect(store.items.length).toEqual(0);

        let new_object = new ObjectWithUUID();
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);
    });

    it('can remove objects', () => {
        let new_object = new ObjectWithUUID();
        store.add_object_to_array(new_object);
        expect(store.items.length).toEqual(1);

        store.remove_object_from_array(new_object);
        expect(store.items.length).toEqual(0);
    });

});