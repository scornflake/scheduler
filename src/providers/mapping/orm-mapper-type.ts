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
    async_storeOrUpdateObject(object: ObjectWithUUID, forceRevCheck: boolean, ignoreNotFound: boolean): Promise<ObjectWithUUID>;

    async_LoadObjectWithUUID(id: string, useCache: boolean, nesting: number): Promise<TypedObject>;

    async_DoesObjectExistWithUUID(id: string): Promise<boolean>;

    addDBSpecificPropertiesToDict(dict: object, obj: any, nesting: number);
}

interface IReferenceResolver {
    async_lookupObjectReference(reference: ObjectReference, nesting: number);

    async_lookupListOfReferences(references, nesting: number);

    async_lookupMapOfReferenceValues(mapping: PropertyMapping, mapWithReferenceValues: any, nesting: number);

    async_lookupMapOfReferenceKeys(mapping: PropertyMapping, mapWithReferenceKeys: any, nesting: number);
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
