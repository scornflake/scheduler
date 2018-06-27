import {ObjectWithUUID} from "../../scheduling/base-types";
import {TypedObject} from "../../scheduling/base-types";

enum MappingType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    MapWithReferenceValues = 'refmap',
    MapWithReferenceKeys = 'refkeymap',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

enum PropertyHint {
    String = 'string',
    Date = 'date',
    Number = 'num'
}

type ObjectReference = {
    type: string;
    id: string;
}

type PropertyMapping = {
    name: string,
    privateName?: string,
    type?: MappingType, // if not specified == PersistenceType.Property
    hint?: PropertyHint
}

type ClassMapping = {
    name: string;
    fields?: (PropertyMapping)[],
    inherit?: string,
    exclude?: string[],
    factory // always required, because the mapper instantiates objects to check properties

}

type ClassFieldMapping = {
    classes: Array<ClassMapping>
}


interface IObjectStore {
    async_store_or_update_object(object: ObjectWithUUID, force_rev_check: boolean, ignore_not_found: boolean): Promise<ObjectWithUUID>;

    async_load_object_with_id(id: string, useCache: boolean, nesting: number): Promise<TypedObject>;

    async_does_object_with_id_exist(id: string): Promise<boolean>;

    add_db_specific_properties_to_dict(dict: object, obj: any, nesting: number);
}

interface IReferenceResolver {
    async_lookup_object_reference(reference: ObjectReference, nesting: number);

    async_lookup_list_of_references(references, nesting: number);

    async_lookup_map_of_reference_values(mapping: PropertyMapping, mapWithReferenceValues: any, nesting: number);

    async_lookup_map_of_reference_keys(mapping: PropertyMapping, value: any, nesting: number);
}


const REF_PREFIX = 'rrr';

const OrmMappingTypeNames = {};
OrmMappingTypeNames[MappingType.Property] = "Property";
OrmMappingTypeNames[MappingType.Reference] = "Reference";
OrmMappingTypeNames[MappingType.ReferenceList] = "ReferenceList";
OrmMappingTypeNames[MappingType.MapWithReferenceValues] = "MapWithReferenceValues";
OrmMappingTypeNames[MappingType.MapWithReferenceKeys] = "MapWithReferenceKeys";
OrmMappingTypeNames[MappingType.NestedObject] = "NestedObject";
OrmMappingTypeNames[MappingType.NestedObjectList] = "NestedObjectList";

function NameForMappingPropType(type: MappingType) {
    return OrmMappingTypeNames[type];
}


export {
    IObjectStore,
    IReferenceResolver,
    ObjectReference,
    MappingType,
    ClassMapping,
    ClassFieldMapping,
    PropertyMapping,
    PropertyHint,
    NameForMappingPropType,
    REF_PREFIX
};
