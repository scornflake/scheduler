import {PersistenceType} from "./db-types";

const propsMetadataKey = Symbol('persisted');
const classesMetadataKey = Symbol('classes');
const REF_PREFIX: string = 'rrr';

type PersistenceProperty = { type: PersistenceType, name: string };

class Us {

}

function persisted(type: PersistenceType = PersistenceType.Property): PropertyDecorator {
    function _persisted(target: object, propertyKey: string) {
        let class_name = target.constructor.name;
        if (target.hasOwnProperty('constructor')) {
            console.debug(`Register persisted property [${type}]: ${class_name}, prop: ${propertyKey}`);

        }
        let properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, target);
        if (properties) {
            properties.push({type: type, name: propertyKey});
        } else {
            properties = [{type: type, name: propertyKey}];
            Reflect.defineMetadata(propsMetadataKey, properties, target);
        }

        let class_names: string[] = Reflect.getMetadata(classesMetadataKey, Us);
        if (class_names) {
            if (class_names.indexOf(class_name) == -1) {
                class_names.push(class_name);
                console.debug(`Register persisted class: ${class_name}`);
            }
        } else {
            class_names = [class_name];
            console.debug(`Register persisted class: ${class_name}`);
            Reflect.defineMetadata(classesMetadataKey, class_names, Us);
        }
    }

    return _persisted;
}

export {
    PersistenceProperty,
    persisted,
    REF_PREFIX,
    propsMetadataKey
}