import {SchedulerDatabase} from "../../providers/server/db";
import {Person} from "../../scheduling/people";
import {ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";
import {persisted} from "../../providers/server/db-decorators";
import {PersistenceType} from "../../providers/server/db-types";
import {MockConfigurationService} from "../../app/logging-configuration";
import {observable} from "mobx";
import {SafeJSON} from "../../common/json/safe-stringify";
import {TeamsStore} from "../../scheduling/teams-store";

class SomeEntity extends ObjectWithUUID {
    @persisted() some_field: string = "a value";
}

class Empty extends ObjectWithUUID {
}

class ThingWithNestedObjects extends ObjectWithUUID {
    @persisted(PersistenceType.NestedObjectList)
    my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
}


describe('db', () => {
    let db;

    beforeEach((done) => {
        let config = MockConfigurationService.ServiceForTests();
        SchedulerDatabase.ConstructAndWait(config).then(new_db => {
            db = new_db;
            done();
        });
    });

    it('can create reference of person object', function () {
        let person = new Person("Me!");
        expect(person.type).toBe("Person");
        let ref = db.reference_for_object(person);
        expect(ref).toBe(`rrr:Person:${person.uuid}`);
    });

    it('type is included in a nested object which is an PersistableObject', function () {
        class VerySimple extends PersistableObject {
            @persisted(PersistenceType.NestedObject) child = new SomeEntity();
        }

        /*
        SomeEntity is actually a ObjectWithUUID. BUT: we're persisting it as a nested object, NOT A REFERENCE.
        So, we don't actually EXPECT the _rev and _id to be returned back to us.
         */

        let value = new VerySimple();
        let obj_dict = db.create_json_from_object(value);
        console.log(`Resulting obj dict: ${SafeJSON.stringify(obj_dict)}`);
        expect(value.child.type).not.toBeUndefined();
    });

    it('creates minimal JSON from empty object', function () {
        let empty = new Empty();
        let json = db.create_json_from_object(empty);
        console.log(`Empty JSON: ${JSON.stringify(json)}`);
        expect(json.type).toBe("Empty");
        expect(json._id).toBe(empty.uuid);
    });

    it('converts only persistable properties', function () {
        class ContainedObject extends PersistableObject {
            @persisted()
            some_field: string = "a value";

            something_else: string = "not persisted";
        }

        class ThingWithContainedObject extends ObjectWithUUID {
            @persisted()
            name: string = "This is my name";

            note: string = "This isn't persisted";

            @persisted(PersistenceType.NestedObject)
            another_object: ContainedObject = new ContainedObject();
        }


        let simple = new ThingWithContainedObject();
        let json = db.create_json_from_object(simple);
        console.log(`JSON: ${JSON.stringify(json)}`);

        expect(json.type).toBe("ThingWithContainedObject", "space!");
        expect(json.note).toBeUndefined("the final frontier");

        console.log(`Contained object = ${JSON.stringify(json.another_object)}`);
        expect(json.another_object).toEqual({some_field: "a value", type: "ContainedObject"}, "aliens are upon us");
        expect(json.another_object.something_else).toBeUndefined("but they come in peace");
    });

    it('can convert object with UUID to a reference', function () {
        class ThingWithReference extends ObjectWithUUID {
            @persisted() name: string = "This is my name";
            note: string = "This isn't persisted";
            @persisted(PersistenceType.Reference) another_object: SomeEntity = new SomeEntity();
        }

        let simple = new ThingWithReference();

        let json = db.create_json_from_object(simple);
        expect(json.type).toBe("ThingWithReference");
        expect(json.another_object).toBe(`rrr:SomeEntity:${simple.another_object.uuid}`, 'reference compare failed');
    });

    it('should convert a list of references', function () {
        class ThingWithListOfReferences extends ObjectWithUUID {
            @persisted(PersistenceType.ReferenceList)
            my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
        }

        let instance = new ThingWithListOfReferences();
        let json = db.create_json_from_object(instance);
        let expected_items = [
            db.reference_for_object(instance.my_list[0]),
            db.reference_for_object(instance.my_list[1]),
            db.reference_for_object(instance.my_list[2])
        ];
        // console.log(`JSON: ${JSON.stringify(json)}`);
        expect(json.my_list).toEqual(expected_items);
    });

    it('should convert an observable mbox list', function () {
        class ThingWithListOfReferences extends ObjectWithUUID {
            @observable @persisted(PersistenceType.ReferenceList)
            my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
        }

        let instance = new ThingWithListOfReferences();
        let json = db.create_json_from_object(instance);
        let expected_items = [
            db.reference_for_object(instance.my_list[0]),
            db.reference_for_object(instance.my_list[1]),
            db.reference_for_object(instance.my_list[2])
        ];
        // console.log(`JSON: ${JSON.stringify(json)}`);
        expect(json.my_list).toEqual(expected_items);
    });

    it('able to convert list of nested objects', function () {
        let instance = new ThingWithNestedObjects();
        let json = db.create_json_from_object(instance);
        let expected_items = [
            {type: 'SomeEntity', some_field: "a value"},
            {type: 'SomeEntity', some_field: "a value"},
            {type: 'SomeEntity', some_field: "a value"},
        ];
        // console.log(`JSON: ${JSON.stringify(json)}`);
        expect(json.my_list).toEqual(expected_items);

    });

    it('can load a simple single object with uuid', (done) => {
        let an_entity = new SomeEntity();
        db.store_or_update_object(an_entity).then((saved_object) => {

            console.log(`Response from store: ${SafeJSON.stringify(saved_object)}`);
            let obj_id = saved_object._id;
            console.log(`ID should be: ${obj_id}, with returned type: ${saved_object.constructor.name}`);

            db.load_object_with_id(obj_id).then(loaded_entity => {
                console.log(`Response from load: ${SafeJSON.stringify(loaded_entity)}`);
                expect(loaded_entity.uuid).toEqual(an_entity.uuid);
                done();
            });
        });
    });

    it('can load a list of nested objects', function (done) {
        let instance = new ThingWithNestedObjects();
        let nested_one = instance.my_list[0];
        let nested_two = instance.my_list[1];
        let nested_three = instance.my_list[2];
        db.store_or_update_object(instance).then(() => {
            // load it and check we get it back
            db.load_object_with_id(instance.uuid).then(loaded_instance => {
                console.log(`Got back a loaded object: ${SafeJSON.stringify(loaded_instance)}`);
                expect(loaded_instance.uuid).toEqual(instance.uuid);
                expect(loaded_instance.my_list.length).toEqual(3);

                let ld_nested_one = loaded_instance.my_list[0];
                let ld_nested_two = loaded_instance.my_list[1];
                let ld_nested_three = loaded_instance.my_list[2];

                expect(nested_one.some_field).toEqual(ld_nested_one.some_field);
                expect(nested_two.some_field).toEqual(ld_nested_two.some_field);
                expect(nested_three.some_field).toEqual(ld_nested_three.some_field);

                /*
                    Note: ld_nested_* would normally have _id and _rev, based on ObjectWithUUID default constructor.
                    However the db loader will check for this (in the factory). It 'undefines' _id and _rev so that new instances DO NOT automatically get _id and _rev.
                 */

                // Because it was marked as a NestedObject and not a reference, no _id/_rev should be present
                // console.log(`Nested #1: ${SafeJSON.stringify(ld_nested_one)}`);
                expect(ld_nested_one._id).toBeUndefined();
                expect(ld_nested_one._rev).toBeUndefined();
                done();
            });
        })
    });

    it('items of a BaseStore should still be observable after "remove" is called', function () {
        /*
        remove assigns a NEW list to this.items.
        want to make sure it's still observable
         */
        function test_is_observable(list) {

        }
        let team_store = new TeamsStore();
    });

    it('should store a person with nested availability', function (done) {
        let me = new Person("Neil");
        expect(me.availability).not.toBeNull();
        expect(me.availability.unit).not.toBeNull();

        let dict_obj = db.create_json_from_object(me);
        console.log(`I made: ${SafeJSON.stringify(dict_obj)}`);

        db.store_or_update_object(me).then(() => {
            db.load_object_with_id(me.uuid).then((loaded_obj) => {
                let reconstructed_dict = db.create_json_from_object(loaded_obj);

                // need to make this the same this for the equal to work
                reconstructed_dict['_rev'] = undefined;

                console.log(`I loaded: ${SafeJSON.stringify(dict_obj)}`);
                expect(reconstructed_dict).toEqual(dict_obj);
                done();
            })
        })
    });
});
