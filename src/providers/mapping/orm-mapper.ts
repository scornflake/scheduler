import {isArray, isUndefined} from "util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {isObservableArray, isObservableMap, isObservableObject} from "mobx";
import {ClassFieldMapping, ClassMapping, MappingType, PropertyMapping} from "./orm-mapper-type";

function GetTheTypeNameOfTheObject(object: any): string {
    if (object instanceof Map) {
        return "map";
    }
    if (typeof object !== "object" || !object || !object.constructor) return "";
    if (object.constructor.name === "ObservableMap" || isObservableMap(object)) return isObservableMap(object) ? "map" : "";
    else if (object.constructor.name === "ObservableArray") return isObservableArray(object) ? "array" : "";
    else if (isArray(object)) return "array";
    else return isObservableObject(object) ? "object" : "";
}

let internal_mappings: ClassFieldMapping = {
    classes: [
        {
            name: 'TypedObject',
            fields: [
                {name: 'type'}
            ],
            factory: null
        },
        {
            name: 'ObjectWithUUID',
            fields: [
                {name: '_id'},
                {name: '_rev'}
            ],
            factory: null,
            inherit: 'TypedObject'
        },
        {
            name: 'NamedObject',
            fields: [
                {name: 'name'}
            ],
            factory: null,
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

            // Check the inherit field
            if (cm.inherit) {
                if (this.definitions.get(cm.inherit) == null) {
                    throw new Error(`Unable to inherit from ${cm.inherit}, no type with this name defined in the mapping.`);
                }
            }

            if (cm.fields) {
                cm.fields.forEach(field => {
                    if (field.name == '*') {
                        // Get the factory and instantiate one of these, to find out its fields
                        let fields = [];
                        this.logger.debug(`Got wildcard, finding all properties of ${cm.name}...`);
                        let inherited = new Array<string>();
                        if (cm.inherit) {
                            let inheritedProps = this.propertiesFor(cm.inherit);
                            inherited = Array.from(inheritedProps.keys());
                            this.logger.debug(`Inherited properties: ${SafeJSON.stringify(inherited)}`);
                        }
                        actual_properties.forEach((key: string) => {
                            // If it starts with an _, assume it is private. Take it out (we'll discover private as part of sanitize_field)
                            if (key.startsWith("_")) {
                                key = key.substr(1);
                            }
                            if(cm.exclude) {
                                if(cm.exclude.indexOf(key) != -1) {
                                    this.logger.debug(`Ignore ${key}, it's excluded`);
                                    return;
                                }
                            }
                            let field: PropertyMapping = {name: key, type: MappingType.Property};
                            if (inherited.indexOf(key) != -1) {
                                this.logger.debug(` * skip prop ${cm.name}.${field.name}, inherited`);
                            } else {
                                this.logger.debug(` * prop ${cm.name}.${field.name}`);
                                fields.push(this.sanitize_field(cm, field, actual_properties, verify_property_names));
                            }
                        });
                        this.logger.debug(`Fields = '*', discovered: ${SafeJSON.stringify(field)}`);
                        cm.fields = fields;
                    } else {
                        this.logger.debug(` prop ${cm.name}.${field.name}`);
                        if (isUndefined(field.type) || !field.type) {
                            this.logger.debug(`Default field ${cm.name}.${field.name} to as a Property`);
                            field.type = MappingType.Property;
                        }

                        // Verify the field name
                        this.sanitize_field(cm, field, actual_properties, verify_property_names);
                    }
                });
            }
            this.logger.info(`Add mapping for ${cm.name} (${verify_property_names ? "verified" : "non-verified"})`);
            this.definitions.set(cm.name, cm);
        })
    }

    gap(width: number): string {
        return " ".repeat(width * 2);
    }

    propertiesFor(class_name: string, nesting: number = 0): Map<string, PropertyMapping> {
        this.logger.debug(`${this.gap(nesting)}Getting properties for class: ${class_name}`);
        let cm = this.definitions.get(class_name);
        if (cm == null) {
            throw new Error(`No properties defined for ${class_name}, is the mapping complete?`);
        }
        let all = new Map<string, PropertyMapping>();
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
                    all.set(pm.name, pm);
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

    private sanitize_field(cm: ClassMapping, field: PropertyMapping, actual_properties: Array<string>, validate_prop_name: boolean = false): PropertyMapping {
        if (field.name == '_id' || field.name == '_rev') {
            return field;
        }

        // Does it exist?
        if (validate_prop_name) {
            if (actual_properties.find(name => name == field.name) == null) {
                let privateName = `_${field.name}`;
                if (actual_properties.find(name => name == privateName) == null) {
                    throw new Error(`Cannot find field '${field.name}' or '${privateName} on type ${cm.name}. Spelt right?  All fields are: ${JSON.stringify(actual_properties)}`);
                }


                // OK. Are there 'get' / 'set' functions that match?
                let actual_instance = this.createNewInstanceOfType(cm.name, cm);
                if (!actual_instance) {
                    throw new Error(`Cannot create a ${cm.name} while checking for getter/setter for field ${field.name}`);
                }

                this.logger.debug(`Property ${field.name} not found... trying for ${privateName}. Success.`);
                field.privateName = privateName;

                // Was trying to verify that setters/getters existed.
                // Failed :-(
                // let getter = Object.getOwnPropertyDescriptor(actual_instance, field.name);
                // console.log(`the getter is: ${getter}`);
                // above comes back with 'undefined'
            }
        }
        return field;
    }

    doesTypeInheritFrom(type: string, inherits: string) {
        // does 'other_type' inherit from 'type' at any point?
        let defs = this.definitions.get(type);
        if (!defs) {
            throw Error(`Cannot find definitions for type ${type}`);
        }
        if (!this.definitions.get(inherits)) {
            throw Error(`Cannot find definitions for other type ${inherits}, can't test if ${type} is one of those cos I don't know what the other side is`);
        }
        if (defs.inherit) {
            if (defs.inherit == inherits) {
                return true;
            }
            // no? Walk up and see if any super object does
            return this.doesTypeInheritFrom(defs.inherit, inherits);
        }
        return false;
    }
}

export {
    OrmMapper,
    GetTheTypeNameOfTheObject,
}