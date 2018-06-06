import {SchedulerDatabase} from "../../providers/server/db";
import {Person} from "../../scheduling/people";
import {ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";
import {persisted} from "../../providers/server/db-decorators";
import {PersistenceType} from "../../providers/server/db-types";
import {MockConfigurationService} from "../../app/logging-configuration";
import {observable} from "mobx";
import {SafeJSON} from "../../common/json/safe-stringify";

class SomeEntity extends ObjectWithUUID {
    @persisted() some_field: string = "a value";
}

class Empty extends ObjectWithUUID {
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
        class ThingWithNestedObjects extends ObjectWithUUID {
            @persisted(PersistenceType.NestedObjectList)
            my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
        }

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
});
