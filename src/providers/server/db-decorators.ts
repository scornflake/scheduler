import {PersistenceType, PersistenceTypeNames} from "./db-types";
import {ObjectWithUUID, PersistableObject} from "../../scheduling/common/base_model";

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
    if(!factories) {
        throw new Error(`Cannot create new ${type}, no factories registered (1)`);
    }
    if (factories.length == 0) {
        throw new Error(`Cannot create new ${type}, no factories registered (2)`);
    }
    let factory = factories.find(cf => cf.class_name == type);
    let instance = factory.factory();
    if(instance instanceof ObjectWithUUID) {
        // clear out the _id and _rev, we don't want the defaults
        instance._id = undefined;
        instance._rev = undefined;
    }
    return instance;
}

export {
    PersistenceProperty,
    persisted,
    REF_PREFIX,
    propsMetadataKey,
    NameOfPersistenceProp,
    create_new_object_of_type
}