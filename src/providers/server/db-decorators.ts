import {PersistenceType, PersistenceTypeNames} from "./db-types";
import {PersistableObject} from "../../scheduling/common/base_model";

const propsMetadataKey = Symbol('persisted');
const classesMetadataKey = Symbol('classes');
const REF_PREFIX: string = 'rrr';

type PersistenceProperty = { type: PersistenceType, name: string };
type ClassFactory = { class_name: string, factory: () => any };

function NameOfPersistenceProp(prop: PersistenceProperty) {
    return PersistenceTypeNames[prop.type];
}

function NameOfPersistencePropType(type: PersistenceType) {
    return PersistenceTypeNames[type];
}

class Us {

}

function persisted(type: PersistenceType = PersistenceType.Property): PropertyDecorator {
    function _persisted(target: object, propertyKey: string) {
        let class_name = target.constructor.name;
        if (target.hasOwnProperty('constructor')) {
            console.debug(`Register property ${propertyKey}, type [${NameOfPersistencePropType(type)}], on class: ${class_name}`);
        }
        let properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, target);
        if (properties) {
            properties.push({type: type, name: propertyKey});
        } else {
            properties = [{type: type, name: propertyKey}];
            Reflect.defineMetadata(propsMetadataKey, properties, target);
        }

        let class_names: ClassFactory[] = Reflect.getMetadata(classesMetadataKey, Us);
        let factory = () => {
            let instance = Object.create(target);
            instance.constructor.apply(instance);
            return instance;
        };
        let new_factory = {class_name: class_name, factory: factory};
        if (class_names) {
            let existing = class_names.find(cf => cf.class_name == class_name);
            if (!existing) {
                console.debug(`Register persisted class: ${class_name}`);
                class_names.push(new_factory);
            }
        } else {
            // Nothing at all. Register the first.
            class_names = [new_factory];
            console.debug(`Register persisted class: ${class_name}`);
            Reflect.defineMetadata(classesMetadataKey, class_names, Us);
        }
    }

    return _persisted;
}

function create_new_object_of_type(type: string): PersistableObject {
    const factories: ClassFactory[] = Reflect.getMetadata(classesMetadataKey, Us);
    if (factories.length == 0) {
        throw new Error(`Cannot create new ${type}, no factories registered`);
    }
    let factory = factories.find(cf => cf.class_name == type);
    return factory.factory();
}

export {
    PersistenceProperty,
    persisted,
    REF_PREFIX,
    propsMetadataKey,
    NameOfPersistenceProp,
    create_new_object_of_type
}