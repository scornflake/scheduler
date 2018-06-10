import {PersistenceProperty, PersistenceType, PersistenceTypeNames} from "./db-types";
import {ObjectWithUUID, TypedObject} from "../../scheduling/common/base_model";
import {isObservableArray, isObservableMap, isObservableObject} from "mobx";
import {isArray, isUndefined} from "util";

const classesMetadataKey = Symbol('classes');
const REF_PREFIX: string = 'rrr';

type ClassFactory = { class_name: string, factory: () => any };

function NameForPersistenceProp(prop: PersistenceProperty) {
    return PersistenceTypeNames[prop.type];
}

function NameForPersistencePropType(type: PersistenceType) {
    return PersistenceTypeNames[type];
}

class Us {

}

function GetTheTypeNameOfTheObject(object: any): string {
    if (typeof object !== "object" || !object || !object.constructor) return "";
    if (object.constructor.name === "ObservableMap") return isObservableMap(object) ? "map" : "";
    else if (object.constructor.name === "ObservableArray") return isObservableArray(object) ? "array" : "";
    else if (isArray(object)) return "array";
    else return isObservableObject(object) ? "object" : "";
}

function registerFactory(target: any) {
    if (isUndefined(target)) {
        throw new Error("Huh? Trying to decorate undefined?");
    }
    // save a reference to the original constructor
    let original = target;

    // a utility function to generate instances of a class
    function construct(constructor, args) {
        let c: any = function () {
            return constructor.apply(this, args);
        };
        c.prototype = constructor.prototype;
        return new c();
    }

    // the new constructor behaviour
    let f: any = function (...args) {
        return construct(original, args);
    };

    // copy prototype so intanceof operator still works
    f.prototype = original.prototype;
    registerActualFactory(original.name, f);

    return f;
}


function registerActualFactory(class_name: string, factory) {
    let new_factory = {class_name: class_name, factory: factory};
    let class_names: ClassFactory[] = Reflect.getMetadata(classesMetadataKey, Us);
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

function registerClassFactory(prototype, class_name: string) {
    let factory = () => {
        let instance = Object.create(prototype);
        instance.constructor.apply(instance);
        return instance;
    };
    registerActualFactory(class_name, factory);
}

function RegisteredClassFactories(): ClassFactory[] {
    return Reflect.getMetadata(classesMetadataKey, Us);
}

function CreateNewObjectOfType(type: string): TypedObject {
    const factories: ClassFactory[] = Reflect.getMetadata(classesMetadataKey, Us);
    if (!factories) {
        throw new Error(`Cannot create new ${type}, no factories registered (1)`);
    }
    if (factories.length == 0) {
        throw new Error(`Cannot create new ${type}, no factories registered (2)`);
    }
    let factory = factories.find(cf => cf.class_name == type);
    if (!factory) {
        throw new Error(`Cannot create new ${type}, no factory registered for this type`);
    }
    let instance = factory.factory();
    if (instance instanceof ObjectWithUUID) {
        // clear out the _id and _rev, we don't want the defaults
        instance._id = undefined;
        instance._rev = undefined;
    }
    return instance;
}

export {
    REF_PREFIX,

    ClassFactory,

    RegisteredClassFactories,
    NameForPersistenceProp,
    NameForPersistencePropType,
    CreateNewObjectOfType,

    GetTheTypeNameOfTheObject,

    registerFactory,
}