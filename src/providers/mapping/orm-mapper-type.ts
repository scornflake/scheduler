enum MappingType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    // ReferenceMap = 'refmap',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

type MappingProperty = { name: string, type: MappingType };
const REF_PREFIX = 'rrr';

const OrmMappingTypeNames = {};
OrmMappingTypeNames[MappingType.Property] = "Property";
OrmMappingTypeNames[MappingType.Reference] = "Reference";
OrmMappingTypeNames[MappingType.ReferenceList] = "ReferenceList";
// OrmMappingTypeNames[PersistenceType.ReferenceMap] = "ReferenceMap";
OrmMappingTypeNames[MappingType.NestedObject] = "NestedObject";
OrmMappingTypeNames[MappingType.NestedObjectList] = "NestedObjectList";

function NameForMappingProp(prop: MappingProperty) {
    return OrmMappingTypeNames[prop.type];
}

function NameForMappingPropType(type: MappingType) {
    return OrmMappingTypeNames[type];
}


export {
    MappingType,
    MappingProperty,
    NameForMappingProp,
    NameForMappingPropType,
    REF_PREFIX
};
