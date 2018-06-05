enum PersistenceType {
    Property = 'prop',
    Reference = 'ref',
    ReferenceList = 'reflist',
    NestedObject = 'obj',
    NestedObjectList = 'lst',
}

const PersistenceTypeNames = {};
PersistenceTypeNames[PersistenceType.Property] = "Property";
PersistenceTypeNames[PersistenceType.Reference] = "Reference";
PersistenceTypeNames[PersistenceType.ReferenceList] = "ReferenceList";
PersistenceTypeNames[PersistenceType.NestedObject] = "NestedObject";
PersistenceTypeNames[PersistenceType.NestedObjectList] = "NestedObjectList";

export {
    PersistenceType,
    PersistenceTypeNames
};
