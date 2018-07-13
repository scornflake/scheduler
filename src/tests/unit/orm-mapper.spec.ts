import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {getTestBed, TestBed} from "@angular/core/testing";
import {scheduler_db_map} from "../../assets/db.mapping";
import {MappingType} from "../../providers/mapping/orm-mapper-type";
import {TypedObject} from "../../scheduling/base-types";

describe('mapper', () => {
    let mapper;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [OrmMapper]
        });

        let injector = getTestBed();
        mapper = injector.get(OrmMapper);
        expect(mapper).not.toBeNull("eh? the mapped didn't get instantiated");
    });

    it('if not configured, maps base types', () => {
        let props = mapper.propertiesFor('TypedObject');
        expect(props.get('type').type).toEqual(MappingType.Property);
    });

    it('finds properties first level of inherit', () => {
        let properties = mapper.propertiesFor('ObjectWithUUID');
        expect(properties.size).toEqual(3);
        expect(properties.get('type').type).toEqual(MappingType.Property);
        expect(properties.get('_id').type).toEqual(MappingType.Property);
        expect(properties.get('_rev').type).toEqual(MappingType.Property);
    });

    it('NamedObject inherits from TypedObject', () => {
        let properties = mapper.propertiesFor('NamedObject');

        for (let key of Array.from(properties.keys())) {
            console.log(`key: ${key} = ${properties.get(key)}`);
        }

        expect(properties.get('type').type).toEqual(MappingType.Property);
        expect(properties.get('name').type).toEqual(MappingType.Property);
    });

    it('should throw if mapping not defined', () => {
        expect(() => {
            mapper.propertiesFor('FooScudBar')
        }).toThrowError(/No properties defined for class_name: FooScudBar/)
    });

    it('should throw exception if inherited class isnt in the map', function () {
        class SomeNewObject extends TypedObject {
            my_new_field: string = "foo";
        }

        // this is an incorrect mapping for an Object
        expect(() => {
            mapper.addConfiguration({
                classes: [
                    {
                        name: 'SomeNewObject',
                        fields: [{name: '*'}],
                        inherit: 'ThisCertainlyIsntTypedObject!', // mispelt!
                        factory: () => new SomeNewObject()
                    }
                ]
            })
        }).toThrowError(/Unable to inherit from ThisCertainlyIsntTypedObject!/);
    });

    describe('configured', () => {
        beforeEach(() => {
            mapper.addConfiguration(scheduler_db_map);
        });

        it('uses _ leading fields if property name doesnt exist', function () {
            let properties = mapper.propertiesFor('Person');

            // Person has 'availability', as a getter/setter. Want to specify 'availability' in the mapping, but it should use '_availability' for actual access.

            expect(properties.get('availability')).toBeDefined();
            expect(properties.get('_availability')).toBeUndefined();
        });

        it('putting * in fields means all fields', () => {
            let properties = mapper.propertiesFor('Preferences');
            let names = Array.from(properties.keys());
            console.log(`Got names: ${JSON.stringify(names)}`);
            expect(names).toContain('previous_sheet_id');
            expect(names).not.toContain('*');
        });

        it('throws for unknown object', () => {
            expect(() => {
                mapper.propertiesFor('AnObjectThatDoesntExist');
            }).toThrowError(/is the mapping complete?/);
        });
    });

    it('can test if a type inherits another ', function () {
        expect(mapper.doesTypeInheritFrom('TypedObject', 'TypedObject')).toBeFalsy();

        expect(mapper.doesTypeInheritFrom('ObjectWithUUID', 'TypedObject')).toBeTruthy();
        expect(mapper.doesTypeInheritFrom('NamedObject', 'TypedObject')).toBeTruthy();

    });
});