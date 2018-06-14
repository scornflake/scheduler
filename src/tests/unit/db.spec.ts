import {SchedulerDatabase} from "../../providers/server/db";
import {Person} from "../../scheduling/people";
import {ObjectWithUUID} from "../../scheduling/base-types";
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
import {csd, dayAndHourForDate} from "../../scheduling/common/date-utils";
import {GetTheTypeNameOfTheObject, OrmMapper} from "../../providers/mapping/orm-mapper";
import {OrmConverter} from "../../providers/server/orm-converter";
import {Plan} from "../../scheduling/plan";
import {defaultComputerRole, defaultSoundRole, SetupDefaultRoles} from "../sample-data";
import {Assignment} from "../../scheduling/assignment";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {Role} from "../../scheduling/role";
import {Availability, AvailabilityUnit} from "../../scheduling/availability";
import {TypedObject} from "../../scheduling/base-types";

class SomeEntity extends ObjectWithUUID {
    @observable some_field: string = "a value";

    toString() {
        return this.some_field;
    }
}

class Empty extends ObjectWithUUID {
}

class ThingWithNestedObjects extends ObjectWithUUID {
    @observable my_list = new Array(new SomeEntity(), new SomeEntity(), new SomeEntity());
}

class ThingWithReference extends ObjectWithUUID {
    @observable name: string = "This is my name";
    @observable note: string = "This isn't persisted";
    @observable another_object: SomeEntity = new SomeEntity();
}

class ThingWithMapOfReferences extends ObjectWithUUID {
    @observable some_things: Map<Date, SomeEntity>;

    constructor() {
        super();
        this.some_things = new Map<Date, SomeEntity>();
    }
}

describe('db', () => {
    let db;
    let mapper: OrmMapper;
    let cache: IObjectCache;
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
        cache = new SimpleCache();
        mapper = new OrmMapper();

        //Add in mappings that we need, since we reference other models in this test
        mapper.addConfiguration(scheduler_db_map);

        // Annnd... mappings for this test
        mapper.addConfiguration(test_config);

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 500;
        console.log(`MY PROCESS ENV: ${process.env.NODE_ENV}`);
        let config = MockConfigurationService.ServiceForTests();
        SchedulerDatabase.ConstructAndWait(config, mapper).then(new_db => {
            db = new_db;
            db.setCache(cache);
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
        let converter: OrmConverter;

        beforeEach(() => {
            // so we get the one from the DB, along with the shared cache
            converter = db.converter;
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

        it('should convert date fields to/from ISO strings at root level', function (done) {
            class SimpleWithDate extends ObjectWithUUID {
                some_date: Date = csd(1992, 11, 9);
            }

            let mapping: ClassFieldMapping = {
                classes: [
                    {
                        name: 'SimpleWithDate',
                        fields: [{name: "some_date", hint: PropertyHint.Date}],
                        inherit: 'ObjectWithUUID',
                        factory: () => new SimpleWithDate()
                    }
                ]
            };
            mapper.addConfiguration(mapping);

            let simpleObj = new SimpleWithDate();
            converter.async_create_dict_from_js_object(simpleObj).then(dict => {
                expect(dict.some_date).toEqual(simpleObj.some_date.toISOString());
                converter.async_create_js_object_from_dict(dict, 'SimpleWithDate').then((newObj: SimpleWithDate) => {
                    expect(newObj.some_date).toEqual(simpleObj.some_date);
                    done();
                });
            })
        });

        it('should use the cache when creating from a dict', function (done) {
            // convert a role to a dict, then convert it back. You should get back EXACTLY the same instance
            // since the converter should return the object from the cache
            let role_instance = new Role("Yo yo yo");
            converter.cache.saveInCache(role_instance);

            converter.async_create_dict_from_js_object(role_instance).then(dict => {
                expect(dict.name).toEqual(role_instance.name);

                converter.async_create_js_object_from_dict(dict, 'Role').then((newObj: Role) => {
                    expect(role_instance == newObj).toBeTruthy();
                    expect(newObj == new Role(role_instance.name)).toBeFalsy();
                    done();
                })
            })
        });

        it('should use the cache for list of nested objects', function (done) {
            let team = new Team("Scud Missile");
            let neil = new Person("Neilos");
            team.add(neil);

            converter.cache.saveInCache(team);
            converter.cache.saveInCache(neil);

            converter.async_create_dict_from_js_object(team).then(team_dict => {
                converter.async_create_js_object_from_dict(team_dict, 'Team').then((newTeam: Team) => {
                    expect(team).toEqual(newTeam);
                    expect(team.people[0]).toEqual(neil);
                    expect(team.people[0] === neil).toBeTruthy();
                    done();
                });
            })
        });

        it('should not use the cache for a nested object that doesnt inherit from ObjectWithUUID', (done) => {
            // Person with availability is good for this
            let neil = new Person();
            neil.availability = new Availability(2, AvailabilityUnit.EVERY_N_DAYS);
            cache.saveInCache(neil);

            converter.async_create_dict_from_js_object(neil).then(neil_dict => {
                converter.async_create_js_object_from_dict(neil_dict, 'Person').then((newPerson: Person) => {
                    expect(neil).toEqual(newPerson);

                    // should be different instances
                    expect(neil.availability != newPerson.availability);
                    // but same content
                    expect(neil.availability.isEqual(newPerson.availability)).toBeTruthy();
                    done();
                })
            });
        });


        it('should use the cache for a single nested object', function (done) {
            // A plan has a team (single reference)
            let team = new Team("A team");
            let plan = new Plan("Ta daa", team);
            cache.saveInCache(plan);

            converter.async_create_dict_from_js_object(plan).then(plan_dict => {
                converter.async_create_js_object_from_dict(plan_dict, 'Plan').then((newPlan: Plan) => {
                    expect(plan).toEqual(newPlan);
                    expect(team).toEqual(newPlan.team);
                    expect(plan.team == newPlan.team).toBeTruthy();
                    done();
                })
            });
        });

        describe('can persist a Plan', function () {
            SetupDefaultRoles();

            let neil;
            let bob;
            let team;
            let thePlan;
            let specificDate;
            let soundRoleRef;
            let computerRoleRef;

            beforeEach(() => {
                specificDate = csd(2018, 2, 10);

                neil = new Person("neil");
                bob = new Person("bob");
                team = new Team("My team", [neil, bob]);
                thePlan = new Plan("Cunning", team);

                soundRoleRef = converter.reference_for_object(defaultSoundRole);
                computerRoleRef = converter.reference_for_object(defaultComputerRole);

                thePlan.start_date = csd(2018, 1, 21);
                thePlan.end_date = csd(2018, 3, 21);
                thePlan.add_role(defaultSoundRole);
                thePlan.add_role(defaultComputerRole);

                thePlan.assignment_for(neil).add_role(defaultSoundRole, 5);
                thePlan.assignment_for(neil).add_role(defaultComputerRole);
                thePlan.assignment_for(bob).add_role(defaultComputerRole);

                thePlan.assignment_for(neil).put_on_specific_role_for_date(defaultSoundRole, specificDate);
            });

            it('can create JS object from dict', function (done) {
                // have to do this cos at the moment, the converter does NOT add to the cache
                cache.saveInCache(defaultSoundRole);
                cache.saveInCache(defaultComputerRole);
                converter.async_create_dict_from_js_object(thePlan).then(dict => {
                    // console.log(`made a dict for the Plan: ${JSON.stringify(dict)}...`);
                    converter.async_create_js_object_from_dict(dict, 'Plan').then((jsObject: Plan) => {
                        console.log(`Reconstruction: ${SafeJSON.stringify(jsObject)}`);

                        expect(jsObject.name).toEqual(thePlan.name);
                        expect(jsObject.uuid).toEqual(thePlan.uuid);

                        expect(jsObject.start_date).toEqual(thePlan.start_date);
                        expect(jsObject.end_date).toEqual(thePlan.end_date);
                        expect(jsObject.days_per_period).toEqual(thePlan.days_per_period);

                        console.log(`Got roles: ${JSON.stringify(jsObject.roles)}`);

                        // we lookup the exact same instances (shared ones). This checks that the cache
                        // is used by the converter/loader
                        expect(jsObject.roles.indexOf(defaultSoundRole)).not.toEqual(-1);
                        expect(jsObject.roles.indexOf(defaultComputerRole)).not.toEqual(-1);

                        done();
                    });
                });
            });

            it('can create dict from object', function (done) {
                converter.async_create_dict_from_js_object(thePlan).then(dict => {
                    console.log(`We made: ${JSON.stringify(dict)}`);

                    expect(dict.start_date).toEqual(thePlan.start_date.toISOString());
                    expect(dict.end_date).toEqual(thePlan.end_date.toISOString());

                    // Roles
                    let roles = dict.roles;
                    expect(roles).not.toBeUndefined();
                    expect(roles.length).toEqual(2);

                    // a team would be good :)
                    expect(dict.team).toEqual(converter.reference_for_object(team));

                    // let specifics = dict.specific_role_rules;
                    // expect(specifics).not.toBeNull();
                    // console.log(`Specifics: ${JSON.stringify(specifics)}`);
                    //
                    // fail('ra');

                    // assignments, fun times!
                    // This should end up being a list of Assignment dicts. We want to see 2 (one pers person).
                    let assigns = dict.assignments;
                    expect(assigns.length).toEqual(2);
                    let assign_for_neil: Assignment = null;
                    let assign_for_bob: Assignment = null;

                    // lets split them out and find the assignments for the people
                    assigns.forEach(a => {
                        console.log(`Assign: ${JSON.stringify(a)}`);
                        if (a['person'] == converter.reference_for_object(neil)) {
                            assign_for_neil = a;
                        }
                        if (a['person'] == converter.reference_for_object(bob)) {
                            assign_for_bob = a;
                        }
                    });
                    expect(assign_for_neil).not.toBeNull();
                    expect(assign_for_bob).not.toBeNull();

                    // Role Weightings - the basic stuff
                    expect(assign_for_neil.role_weightings[soundRoleRef]).toEqual(5);
                    expect(assign_for_neil.role_weightings[computerRoleRef]).toEqual(1);
                    expect(assign_for_bob.role_weightings[computerRoleRef]).toEqual(1);


                    // Specific Roles.
                    //
                    // Assignment has one of the most complex structures.
                    // specific_roles
                    //   Maps from a string -> array of role references

                    // Lets take neil. In the 'computer' role.
                    console.log(`checking assignment for ${dayAndHourForDate(specificDate)}`);
                    expect(assign_for_neil.specific_roles[dayAndHourForDate(specificDate)]).toEqual([soundRoleRef]);

                    done();
                });
            });
        });

        it('can convert map of {ref,any} to a dict', function (done) {
            class MapAnyRefs extends ObjectWithUUID {
                @observable map_of_stuffs = new Map<SomeEntity, number>();
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
                converter.async_create_js_object_from_dict(dict, 'MapAnyRefs').then((js_object: MapAnyRefs) => {
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

        it('converts only mapped properties', function (done) {
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
                        console.log(`Type of returned map is: ${loaded_object.some_things.constructor.name}`);
                        expect(GetTheTypeNameOfTheObject(loaded_object.some_things)).toEqual("map");

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

                converter.async_create_js_object_from_dict(dict_obj, 'Person').then((reconstructed_js_obj: Person) => {
                    // need to make this the same this for the equal to work
                    reconstructed_js_obj['_rev'] = undefined;

                    console.log(`I loaded: ${SafeJSON.stringify(reconstructed_js_obj)}`);
                    expect(reconstructed_js_obj instanceof Person).toBeTruthy();
                    expect(reconstructed_js_obj.name).toEqual(me.name);
                    expect(reconstructed_js_obj.availability).toEqual(me.availability);
                    done();
                })
            });
        });
    })
});
