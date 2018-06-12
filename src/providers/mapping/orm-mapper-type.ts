import {ObjectWithUUID, TypedObject} from "../../scheduling/common/base_model";

enum MappingType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    ReferenceMap = 'refmap',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

enum PropertyHint {
    String = 'string',
    Date = 'date',
}

type PropertyMapping = {
    name: string,
    type?: MappingType, // if not specified == PersistenceType.Property
    hint?: PropertyHint
}

type ClassMapping = {
    name: string;
    fields?: PropertyMapping[],
    inherit?: string,
    factory?
}

type ClassFieldMapping = {
    classes: Array<ClassMapping>
}

interface IObjectLoader {
    async_store_or_update_object(object: ObjectWithUUID, force_rev_check: boolean, ignore_not_found: boolean): Promise<ObjectWithUUID>;

    async_load_object_with_id(id: string, nesting: number): Promise<TypedObject>;

    async_does_object_with_id_exist(id: string): Promise<boolean>;

    add_db_specific_properties_to_dict(dict: object, obj: any, nesting: number);
}

const REF_PREFIX = 'rrr';

const OrmMappingTypeNames = {};
OrmMappingTypeNames[MappingType.Property] = "Property";
OrmMappingTypeNames[MappingType.Reference] = "Reference";
OrmMappingTypeNames[MappingType.ReferenceList] = "ReferenceList";
OrmMappingTypeNames[MappingType.ReferenceMap] = "ReferenceMap";
OrmMappingTypeNames[MappingType.NestedObject] = "NestedObject";
OrmMappingTypeNames[MappingType.NestedObjectList] = "NestedObjectList";

function NameForMappingPropType(type: MappingType) {
    return OrmMappingTypeNames[type];
}


export {
    IObjectLoader,
    MappingType,
    ClassMapping,
    ClassFieldMapping,
    PropertyMapping,
    PropertyHint,
    NameForMappingPropType,
    REF_PREFIX
};
