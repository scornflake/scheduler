import {OrmMapper} from "./orm-mapper";
import {getTestBed, TestBed} from "@angular/core/testing";
import {scheduler_db_map} from "../../assets/db.mapping";
import {PersistenceType} from "./orm-mapper-type";

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
        expect(props.get('type')).toEqual(PersistenceType.Property);
    });

    it('finds properties first level of inherit', () => {
        let properties = mapper.propertiesFor('ObjectWithUUID');
        expect(properties.size).toEqual(3);
        expect(properties.get('type')).toEqual(PersistenceType.Property);
        expect(properties.get('_id')).toEqual(PersistenceType.Property);
        expect(properties.get('_rev')).toEqual(PersistenceType.Property);
    });

    it('NamedObject inherits from TypedObject', () => {
        let properties = mapper.propertiesFor('NamedObject');

        for (let key of Array.from(properties.keys())) {
            console.log(`key: ${key} = ${properties.get(key)}`);
        }

        expect(properties.get('type')).toEqual(PersistenceType.Property);
        expect(properties.get('name')).toEqual(PersistenceType.Property);
    });

    describe('configured', () => {
        beforeEach(() => {
            mapper.addConfiguration(scheduler_db_map);
        });

        it('putting * in fields means all fields', () => {
            // Try SavedState
            let properties = mapper.propertiesFor('SavedState');
            let names = Array.from(properties.keys());
            console.log(`Got names: ${JSON.stringify(names)}`);
            expect(names).toContain('previous_sheet_id');
            expect(names).not.toContain('*');
        });

        it('returns [] if no properties', () => {
            let properties = mapper.propertiesFor('AnObjectThatDoesntExist');
            expect(properties).toEqual(new Map<string, PersistenceType>());
        });
    });
});