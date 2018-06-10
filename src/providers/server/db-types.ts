enum PersistenceType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    // ReferenceMap = 'refmap',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

type PersistenceProperty = { name: string, type: PersistenceType };

const PersistenceTypeNames = {};
PersistenceTypeNames[PersistenceType.Property] = "Property";
PersistenceTypeNames[PersistenceType.Reference] = "Reference";
PersistenceTypeNames[PersistenceType.ReferenceList] = "ReferenceList";
// PersistenceTypeNames[PersistenceType.ReferenceMap] = "ReferenceMap";
PersistenceTypeNames[PersistenceType.NestedObject] = "NestedObject";
PersistenceTypeNames[PersistenceType.NestedObjectList] = "NestedObjectList";

export {
    PersistenceType,
    PersistenceProperty,
    PersistenceTypeNames
};
