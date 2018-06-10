enum PersistenceType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    // ReferenceMap = 'refmap',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

type PersistenceProperty = { name: string, type: PersistenceType };
const REF_PREFIX = 'rrr';

const PersistenceTypeNames = {};
PersistenceTypeNames[PersistenceType.Property] = "Property";
PersistenceTypeNames[PersistenceType.Reference] = "Reference";
PersistenceTypeNames[PersistenceType.ReferenceList] = "ReferenceList";
// PersistenceTypeNames[PersistenceType.ReferenceMap] = "ReferenceMap";
PersistenceTypeNames[PersistenceType.NestedObject] = "NestedObject";
PersistenceTypeNames[PersistenceType.NestedObjectList] = "NestedObjectList";

function NameForPersistenceProp(prop: PersistenceProperty) {
    return PersistenceTypeNames[prop.type];
}

function NameForPersistencePropType(type: PersistenceType) {
    return PersistenceTypeNames[type];
}


export {
    PersistenceType,
    PersistenceProperty,
    NameForPersistenceProp,
    NameForPersistencePropType,
    REF_PREFIX
};
