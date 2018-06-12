import {SchedulerDatabase} from "../../providers/server/db";
import {Person} from "../../scheduling/people";
import {ObjectWithUUID, TypedObject} from "../../scheduling/common/base_model";
import {MockConfigurationService} from "../../app/logging-configuration";
import {observable} from "mobx";
import {SafeJSON} from "../../common/json/safe-stringify";
import {scheduler_db_map} from "../../assets/db.mapping";
import {
    ClassFieldMapping,
    ClassMapping,
    MappingType,
    PropertyHint,
    PropertyMapping
} from "../../providers/mapping/orm-mapper-type";
import {Team} from "../../scheduling/teams";
import {csd} from "../../scheduling/common/date-utils";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {OrmConverter} from "../../providers/server/orm";
import {Role} from "../../scheduling/role";

class SomeEntity extends ObjectWithUUID {
    some_field: string = "a value";
}

class Empty extends ObjectWithUUID {
}

class ThingWithNestedObjects extends ObjectWithUUID {
    my_list = new Array(new SomeEntity(), new SomeEntity(), new SomeEntity());
}

class ThingWithReference extends ObjectWithUUID {
    name: string = "This is my name";
    note: string = "This isn't persisted";
    another_object: SomeEntity = new SomeEntity();
}

class ThingWithMapOfReferences extends ObjectWithUUID {
    some_things: Map<Date, SomeEntity>;

    constructor() {
        super();
        this.some_things = new Map<Date, SomeEntity>();
    }
}

describe('db', () => {
    let db;
    let mapper: OrmMapper;
    let test_config: ClassFieldMapping = {
        classes: [
            {
                name: 'SomeEntity',
                fields: [
                    {name: 'some_field'}
                ],
                inherit: 'ObjectWithUUID',
                factory: () => new SomeEntity()
            },
            {
                name: 'Empty',
                inherit: 'ObjectWithUUID',
                factory: () => new Empty()
            },
            {
                name: 'ThingWithNestedObjects',
                fields: [
                    {name: 'my_list', type: MappingType.NestedObjectList}
                ],
                inherit: 'ObjectWithUUID',
                factory: () => new ThingWithNestedObjects()
            },
            {
                name: 'ThingWithReference',
                fields: [
                    {name: 'name'},
                    {name: 'another_object', type: MappingType.Reference}
                ],
                inherit: 'ObjectWithUUID',
                factory: () => new ThingWithReference()
            },
            {
                name: 'ThingWithMapOfReferences',
                fields: [
                    {name: 'some_things', type: MappingType.MapWithReferenceValues, hint: PropertyHint.Date}
                ],
                inherit: 'ObjectWithUUID',
                factory: () => new ThingWithMapOfReferences()
            }
        ]
    };

    beforeEach((done) => {
        mapper = new OrmMapper();

        /*
        Add in mappings that we need, since we reference other models in this test
         */
        mapper.addConfiguration(scheduler_db_map);

        /*
        Annnd... mappings for this test
         */
        mapper.addConfiguration(test_config);


        let config = MockConfigurationService.ServiceForTests();
        SchedulerDatabase.ConstructAndWait(config, mapper).then(new_db => {
            db = new_db;
            done();
        });
    });

    it('can create reference of person object', function () {
        let person = new Person("Me!");
        expect(person.type).toBe("Person");
        let ref = db.converter.reference_for_object(person);
        expect(ref).toBe(`rrr:Person:${person.uuid}`);
    });

    describe('converter tests', () => {
        let converter;
        beforeEach(() => {
            converter = new OrmConverter(mapper, db);
        });

        it('should convert null dates to null', function () {
            let mapping: PropertyMapping = {
                name: 'foo',
                type: MappingType.Property,
                hint: PropertyHint.Date
            };
            expect(converter.convert_from_js_value_to_db_value(null, mapping)).toBeNull();
            expect(converter.convert_from_js_value_to_db_value(undefined, mapping)).toBeUndefined();
        });

        it('can convert map of {ref,any} to a dict', function (done) {
            class MapAnyRefs extends ObjectWithUUID {
                map_of_stuffs = new Map<SomeEntity, number>();
            }

            let ze_mapping: ClassMapping = {
                name: 'MapAnyRefs',
                fields: [
                    {name: 'map_of_stuffs', type: MappingType.MapWithReferenceKeys},
                ],
                inherit: 'ObjectWithUUID',
                factory: () => new MapAnyRefs()
            };
            mapper.addConfiguration({classes: [ze_mapping]});

            let ze_object = new MapAnyRefs();
            let entity_one = new SomeEntity();
            let entity_two = new SomeEntity();
            ze_object.map_of_stuffs.set(entity_one, 42);
            ze_object.map_of_stuffs.set(entity_two, 5);
            converter.async_create_dict_from_js_object(ze_object).then(dict => {
                // expect a map where the keys are references
                console.log(`we created: ${JSON.stringify(dict)}`);

                let ref_1 = converter.reference_for_object(entity_one);
                let ref_2 = converter.reference_for_object(entity_two);

                expect(dict.map_of_stuffs[ref_1]).toEqual(42);
                expect(dict.map_of_stuffs[ref_2]).toEqual(5);

                // Now, if I convert that back into an object, do I get something sensible?
                console.log(`time to see if we can go the other way...`);
                converter.async_create_js_object_from_dict(dict, 'MapAnyRefs').then((js_object:MapAnyRefs) => {
                    console.log(`we hydrated: ${JSON.stringify(js_object)}`);

                    let all_keys = Array.from(js_object.map_of_stuffs.keys());
                    expect(all_keys).toContain(entity_one);
                    expect(all_keys).toContain(entity_two);

                    done();
                });
            })
        });


        it('creates minimal JSON from empty object', function (done) {
            let empty = new Empty();
            converter.async_create_dict_from_js_object(empty).then(dict => {
                console.log(`Empty JSON: ${JSON.stringify(dict)}`);
                expect(dict.type).toBe("Empty");
                expect(dict._id).toBe(empty.uuid);
                done();
            });
        });

        it('converts only persistable properties', function (done) {
            class ContainedObject extends TypedObject {
                some_field: string = "a value";
                something_else: string = "not persisted";
            }

            class ThingWithContainedObject extends ObjectWithUUID {
                name: string = "This is my name";
                note: string = "This isn't persisted";
                another_object: ContainedObject = new ContainedObject();
            }

            let more_map: ClassFieldMapping = {
                classes: [{
                    name: 'ContainedObject',
                    fields: [{name: 'some_field'}],
                    inherit: 'TypedObject',
                    factory: () => new ContainedObject()
                }, {
                    name: 'ThingWithContainedObject',
                    fields: [
                        {name: 'name'},
                        {name: 'another_object', type: MappingType.NestedObject}
                    ],
                    inherit: 'ObjectWithUUID',
                    factory: () => new ThingWithContainedObject()
                }]
            };
            mapper.addConfiguration(more_map);

            let simple = new ThingWithContainedObject();
            converter.async_create_dict_from_js_object(simple).then(dict => {
                console.log(`JSON: ${JSON.stringify(dict)}`);

                expect(dict.type).toBe("ThingWithContainedObject", "space!");
                expect(dict.note).toBeUndefined("the final frontier");

                console.log(`Contained object = ${JSON.stringify(dict.another_object)}`);
                expect(dict.another_object).toEqual({
                    some_field: "a value",
                    type: "ContainedObject"
                }, "aliens are upon us");
                expect(dict.another_object.something_else).toBeUndefined("but they come in peace");
                done();
            });
        });

        it('can convert object with UUID to a reference', function (done) {
            let simple = new ThingWithReference();

            converter.async_create_dict_from_js_object(simple).then(dict => {
                expect(dict.type).toBe("ThingWithReference");
                expect(dict.another_object).toBe(`rrr:SomeEntity:${simple.another_object.uuid}`, 'reference compare failed');
                done();
            });
        });


        it('should convert a list of references', function (done) {
            class ThingWithListOfReferences extends ObjectWithUUID {
                my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
            }

            let more_map: ClassFieldMapping = {
                classes: [{
                    name: 'ThingWithListOfReferences',
                    fields: [
                        {name: 'my_list', type: MappingType.ReferenceList}
                    ],
                    inherit: 'ObjectWithUUID',
                    factory: () => new ThingWithListOfReferences()
                }]
            };
            mapper.addConfiguration(more_map);

            let instance = new ThingWithListOfReferences();
            converter.async_create_dict_from_js_object(instance).then(dict => {
                let expected_items = [
                    converter.reference_for_object(instance.my_list[0]),
                    converter.reference_for_object(instance.my_list[1]),
                    converter.reference_for_object(instance.my_list[2])
                ];
                // console.log(`JSON: ${JSON.stringify(dict)}`);
                expect(dict.my_list).toEqual(expected_items);
                done();
            });
        });

        it('should convert an observable mbox list', function (done) {
            class ThingWithListOfReferences extends ObjectWithUUID {
                @observable my_list = [new SomeEntity(), new SomeEntity(), new SomeEntity()]
            }

            let more_map: ClassFieldMapping = {
                classes: [{
                    name: 'ThingWithListOfReferences',
                    fields: [
                        {name: 'my_list', type: MappingType.ReferenceList}
                    ],
                    inherit: 'ObjectWithUUID',
                    factory: () => new ThingWithListOfReferences()
                }]
            };
            mapper.addConfiguration(more_map);
            let instance = new ThingWithListOfReferences();
            converter.async_create_dict_from_js_object(instance).then(dict => {
                let expected_items = [
                    converter.reference_for_object(instance.my_list[0]),
                    converter.reference_for_object(instance.my_list[1]),
                    converter.reference_for_object(instance.my_list[2])
                ];
                // console.log(`JSON: ${JSON.stringify(dict)}`);
                expect(dict.my_list).toEqual(expected_items);
                done();
            });
        });

        it('able to convert list of nested objects', function (done) {
            let instance = new ThingWithNestedObjects();
            converter.async_create_dict_from_js_object(instance).then(dict => {
                console.log(`JSON: ${JSON.stringify(dict)}`);
                expect(dict.my_list.length).toEqual(3);
                expect(dict.my_list[0].some_field).toEqual('a value');
                expect(dict.my_list[1].some_field).toEqual('a value');
                expect(dict.my_list[2].some_field).toEqual('a value');
                done();
            });
        });

        describe('map tests', () => {
            let a_mappy_thing;
            let someEntityOne;
            let someEntityTwo;
            let date_one;
            let date_two;

            beforeEach(() => {
                someEntityOne = new SomeEntity();
                someEntityTwo = new SomeEntity();
                date_one = csd(2010, 4, 5);
                date_two = csd(2015, 8, 7);

                // expect to have something in the map
                a_mappy_thing = new ThingWithMapOfReferences();
                a_mappy_thing.some_things.set(date_one, someEntityOne);
                a_mappy_thing.some_things.set(date_two, someEntityTwo);

                expect(a_mappy_thing.some_things.size).toEqual(2);
            });

            it('can convert an object with a reference map', (done) => {
                converter.async_create_dict_from_js_object(a_mappy_thing).then(dict => {
                    console.log(`GOT: ${JSON.stringify(dict)}`);

                    // expect the keys on the map to be formatted to ISO date strings
                    expect(dict['some_things'][date_one.toISOString()]).toEqual(converter.reference_for_object(someEntityOne));
                    expect(dict['some_things'][date_two.toISOString()]).toEqual(converter.reference_for_object(someEntityTwo));
                    done();
                });
            });

            it('can save and reload object with reference map', function (done) {
                db.async_store_or_update_object(a_mappy_thing).then(() => {
                    db.async_load_object_with_id(a_mappy_thing.uuid).then((loaded_object: ThingWithMapOfReferences) => {
                        expect(loaded_object).not.toBeNull();

                        // should have a map, with dates
                        console.log(`Got back loaded mappy thing: ${SafeJSON.stringify(loaded_object)}`);
                        expect(loaded_object.some_things.size).toEqual(2);

                        // expect the field to be a Map object instance
                        expect(loaded_object.some_things instanceof Map).toBeTruthy();

                        // Check that the keys are Dates!
                        console.log(`Date One: ${date_one} = ${date_one.getTime()}`);
                        console.log(`Date Two: ${date_two} = ${date_two.getTime()}`);

                        // Seems I can't actually USE the same date keys to lookup into a map?
                        // I checked the getTime() values were the same, yet lookups yield 'undefined'.
                        //
                        // So doing the check a somewhat roundabout way...
                        for (let key of Array.from(loaded_object.some_things.keys())) {
                            expect(key instanceof Date).toBeTruthy();
                            console.log(`Key: '${key}' = ${key.getTime()}, is type ${typeof key} / ${key.constructor.name}`);

                            let value = loaded_object.some_things.get(key);
                            console.log(`   - value for that key: ${JSON.stringify(value)}`);
                            expect(value instanceof SomeEntity).toBeTruthy();

                            expect(value.some_field).toEqual("a value");
                            expect(value.is_new).toBeFalsy();
                            expect(value._id).not.toBeNull();
                            expect(value._rev).not.toBeNull();
                        }


                        done();
                    })
                })
            });
        });


        it('can load a simple single object with uuid', (done) => {
            let an_entity = new SomeEntity();
            db.async_store_or_update_object(an_entity).then((saved_object) => {
                console.log(`Response from store: ${SafeJSON.stringify(saved_object)}`);
                let obj_id = saved_object._id;
                console.log(`ID should be: ${obj_id}, with returned type: ${saved_object.constructor.name}`);

                db.async_load_object_with_id(obj_id).then(loaded_entity => {
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
            db.async_store_or_update_object(instance).then(() => {
                // load it and check we get it back
                db.async_load_object_with_id(instance.uuid).then(loaded_instance => {
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

        it('can store a property with hint of Date', (done) => {
            class MyDateEntity extends ObjectWithUUID {
                the_date: Date = new Date();
            }

            mapper.addConfiguration({
                classes: [
                    {
                        name: 'MyDateEntity',
                        fields: [{name: 'the_date', hint: PropertyHint.Date}],
                        inherit: 'ObjectWithUUID',
                        factory: () => new MyDateEntity()
                    }
                ]
            });

            let little_object = new MyDateEntity();
            converter.async_create_dict_from_js_object(little_object).then((dict) => {
                console.log(`The returned object that could: ${dict}`);
                let iso_value = little_object.the_date.toISOString();
                expect(dict['the_date']).toEqual(iso_value);
                done();
            });
        });

        it('when storing a team, stores a bunch of refs', (done) => {
            let neil = new Person("neil");
            let bob = new Person("bob");
            let team = new Team("My team", [neil, bob]);
            converter.async_create_dict_from_js_object(team).then(dict => {
                // console.log(`I created: ${JSON.stringify(dict)}`);
                let refs = dict['people'];
                expect(refs.length).toEqual(2);
                expect(refs[1]).toEqual(converter.reference_for_object(neil));
                done();
            });
        });

        it('should be able to reconstruct a team from refs, given those refs are stored', function (done) {
            let neil = new Person("neil");
            let bob = new Person("bob");
            db.async_store_or_update_object(neil).then(() => [
                db.async_store_or_update_object(bob).then(() => {

                    // Save the team, and refs, and try to reload
                    let team = new Team("My team", [neil, bob]);
                    db.async_store_or_update_object(team).then(() => {

                        db.async_load_object_with_id(team.uuid).then((loaded_team: Team) => {
                            console.log(`Got back team: ${SafeJSON.stringify(loaded_team)}`);
                            expect(loaded_team.people.length).toEqual(2);
                            expect(['neil', 'bob']).toContain(loaded_team.people[0].name);
                            expect(['neil', 'bob']).toContain(loaded_team.people[1].name);
                            done();
                        })
                    });
                })
            ]);
        });

        it('items of a BaseStore should still be observable after "remove" is called', function () {
            /*
            remove assigns a NEW list to this.items.
            want to make sure it's still observable
             */
            function test_is_observable(list) {

            }

            // let team_store = new TeamsStore();
        });

        it('should store a person with nested availability', function (done) {
            let me = new Person("Neil");
            expect(me.availability).not.toBeNull();
            expect(me.availability.unit).not.toBeNull();
            expect(me.unavailable).not.toBeNull();
            expect(me.unavailable).toEqual([]);

            converter.async_create_dict_from_js_object(me).then(dict_obj => {
                console.log(`I made: ${SafeJSON.stringify(dict_obj)}`);

                // TODO, now with converter split away from DB, probably don't need to do a store/load
                db.async_store_or_update_object(me).then(() => {
                    db.async_load_object_with_id(me.uuid).then((loaded_obj) => {
                        converter.async_create_dict_from_js_object(loaded_obj).then(reconstructed_dict => {
                            // need to make this the same this for the equal to work
                            reconstructed_dict['_rev'] = undefined;

                            console.log(`I loaded: ${SafeJSON.stringify(dict_obj)}`);
                            expect(reconstructed_dict).toEqual(dict_obj);
                            done();
                        })
                    })
                })
            });
        });
    })
});
