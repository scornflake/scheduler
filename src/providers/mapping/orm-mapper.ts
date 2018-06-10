import {isArray, isUndefined} from "util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";
import {ObjectWithUUID} from "../../scheduling/common/base_model";
import {isObservableArray, isObservableMap, isObservableObject} from "mobx";
import {PersistenceType} from "./orm-mapper-type";

function GetTheTypeNameOfTheObject(object: any): string {
    if (typeof object !== "object" || !object || !object.constructor) return "";
    if (object.constructor.name === "ObservableMap") return isObservableMap(object) ? "map" : "";
    else if (object.constructor.name === "ObservableArray") return isObservableArray(object) ? "array" : "";
    else if (isArray(object)) return "array";
    else return isObservableObject(object) ? "object" : "";
}

type PropertyMapping = {
    name: string,
    type?: PersistenceType, // if not specified == PersistenceType.Property
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

let internal_mappings: ClassFieldMapping = {
    classes: [
        {
            name: 'TypedObject',
            fields: [
                {name: 'type'}
            ]
        },
        {
            name: 'ObjectWithUUID',
            fields: [
                {name: '_id'},
                {name: '_rev'}
            ],
            inherit: 'TypedObject'
        },
        {
            name: 'NamedObject',
            fields: [
                {name: 'name'}
            ],
            inherit: 'ObjectWithUUID'
        },

    ]
};

class OrmMapper {
    definitions: Map<string, ClassMapping>;
    private logger: Logger;

    constructor() {
        this.logger = LoggingWrapper.getLogger('db.mapping');
        this.definitions = new Map<string, ClassMapping>();
        this.addConfiguration(internal_mappings, false);
    }

    addConfiguration(map: ClassFieldMapping, verify_property_names: boolean = true) {
        if (!map) {
            throw new Error("No map provided - wot yo do?");
        }
        map.classes.forEach(cm => {
            // We use this to verify the fields.
            let actual_instance = null;
            let actual_properties = [];
            if (verify_property_names) {
                try {
                    actual_instance = this.createNewInstanceOfType(cm.name, cm);
                } catch (e) {
                    throw new Error(`${e}. Is the class spelt correctly in the mapping configuration? Does it exist?`);
                }
                if (!actual_instance) {
                    let message = `Tried to create instance of ${cm.name} but got nothing back. Bad factory for ${cm.name}?`;
                    if (!(isUndefined(cm.factory))) {
                        message += `  Factory is: ${JSON.stringify(cm.factory)}`;
                    }
                    throw new Error(message);
                }
            }
            if (actual_instance) {
                actual_properties = Object.keys(actual_instance);
            }

            if (cm.fields) {
                cm.fields.forEach(field => {
                    this.logger.info(`examine ${cm.name}.${field.name}`);
                    if (field.name == '*') {
                        // Get the factory and instantiate one of these, to find out its fields
                        let fields = [];
                        actual_properties.forEach(key => {
                            fields.push({name: key, type: PersistenceType.Property});
                        });
                        this.logger.info(`Fields = '*', discovered: ${SafeJSON.stringify(field)}`);
                        cm.fields = fields;
                    } else {
                        if (isUndefined(field.type) || !field.type) {
                            this.logger.debug(`Default field ${cm.name}.${field.name} to as a Property`);
                            field.type = PersistenceType.Property;
                        }

                        // Verify the field name
                        if (verify_property_names) {
                            if (actual_properties.find(name => name == field.name) == null) {
                                // Could start with _ with assumed 'getter/setter'.
                                let private_name = `_${field.name}`;
                                if (actual_properties.find(name => name == private_name) == null) {
                                    throw new Error(`Cannot find field '${field.name}' or ${private_name} on type ${cm.name}. Spelt right??  All fields are: ${JSON.stringify(actual_properties)}`);
                                }

                                // TODO: Is there a get/set with this name? How would I find out, JS is sooooo shit.
                            }
                        }
                    }
                });
            }
            this.logger.info(`Add mapping for ${cm.name}`);
            this.definitions.set(cm.name, cm);
        })
    }

    gap(width: number): string {
        return " ".repeat(width * 2);
    }

    propertiesFor(class_name: string, nesting: number = 0): Map<string, PersistenceType> {
        this.logger.debug(`${this.gap(nesting)}Lookup class: ${class_name}`);
        let cm = this.definitions.get(class_name);
        let all = new Map<string, PersistenceType>();
        if (cm) {
            // Add inherited first
            if (cm.inherit) {
                all = this.propertiesFor(cm.inherit, nesting + 1);
            }

            if (cm.fields) {
                this.logger.debug(`${this.gap(nesting)} ${class_name}... has fields: ${JSON.stringify(cm.fields)}`);
                cm.fields.forEach(pm => {
                    if (all.get(pm.name)) {
                        throw new Error(`Cannot add field ${pm.name} to map, for class ${class_name}. It's already there. DUPLICATE FIELD.`);
                    }
                    all.set(pm.name, pm.type);
                })
            }
        }
        let theKeys = Array.from(all.keys());
        this.logger.debug(`${this.gap(nesting)} ${class_name} returning props ${JSON.stringify(theKeys)}`);
        return all;
    }

    createNewInstanceOfType(className: string, cm: ClassMapping = null) {
        if (cm == null) {
            cm = this.definitions.get(className);
            if (cm == null) {
                throw new Error(`Cannot create new ${className}, no factory registered for this type`);
            }
        }
        if (!(isUndefined(cm.factory))) {
            this.logger.debug(`Using factory to create instance of ${className}`);
            let instance = cm.factory();
            if (instance instanceof ObjectWithUUID) {
                // clear out the _id and _rev, we don't want the defaults
                instance._id = undefined;
                instance._rev = undefined;
            }
            return instance;
        }
    }
}

export {
    OrmMapper,
    ClassFieldMapping,
    ClassMapping,
    GetTheTypeNameOfTheObject,
}