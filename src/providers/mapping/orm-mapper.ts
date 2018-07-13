import {isArray, isUndefined} from "util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {configure, isObservableArray, isObservableMap, isObservableObject} from "mobx";
import {
    ClassFieldMapping,
    ClassMapping,
    MappingType,
    ObjectReference,
    PropertyHint,
    PropertyMapping,
    REF_PREFIX
} from "./orm-mapper-type";
import {action} from "mobx-angular";
import * as moment from "moment";

function GetTheTypeNameOfTheObject(object: any): string {
    if (object instanceof Map) {
        return "map";
    }
    if (typeof object !== "object" || !object || !object.constructor) return "";
    if (isObservableMap(object)) return isObservableMap(object) ? "map" : "";
    else if (isObservableArray(object)) return isObservableArray(object) ? "array" : "";
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

        configure({
            enforceActions: true
        });
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
                // actual_properties = Object.getOwnPropertyNames(actual_instance);
                this.logger.debug(`All properties of ${cm.name}: ${actual_properties.join(", ")}`);
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
                            this.logger.debug(`Inherited properties: ${SWBSafeJSON.stringify(inherited)}`);
                        }
                        actual_properties.forEach((key: string) => {
                            // If it starts with an _, assume it is private. Take it out (we'll discover private as part of sanitize_field)
                            if (key.startsWith("_")) {
                                key = key.substr(1);
                            }
                            if (cm.exclude) {
                                if (cm.exclude.indexOf(key) != -1) {
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
                        this.logger.debug(`Fields = '*', discovered: ${SWBSafeJSON.stringify(field)}`);
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
            let names = "";
            if (cm.fields) {
                names = cm.fields.map(f => f.name).join(", ");
            }
            this.logger.debug(`Add mapping for ${cm.name} (${verify_property_names ? "verified" : "non-verified"}) (${names})`);
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
            throw new Error(`No properties defined for class_name: ${class_name}, nesting: ${nesting}, is the mapping complete?`);
        }
        let all = new Map<string, PropertyMapping>();
        if (cm) {
            // Add inherited first
            if (cm.inherit) {
                try {
                    all = this.propertiesFor(cm.inherit, nesting + 1);
                } catch (err) {
                    throw new Error(`Cannot get inherited properties for: ${cm.name}, inherit: ${cm.inherit}, fields: ${cm.fields.join(",")}. Original: ${err}`);
                }
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

    @action
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
                instance.undefineIdAndRev();
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

    referenceForObject(obj: ObjectWithUUID) {
        return `${REF_PREFIX}:${obj.type}:${obj._id}`;
    }

    parseReference(reference: string): ObjectReference {
        // noinspection SuspiciousTypeOfGuard
        if (typeof reference != 'string') {
            throw new Error(`reference ${reference} is not a string!`);
        }
        let parts = reference.split(':');
        if (parts.length != 3) {
            throw new Error(`Invalid reference ${reference}. Expected 3 parts`);
        }
        if (parts[0] != REF_PREFIX) {
            throw new Error(`Invalid reference ${reference}. Expected part[0] to be 'ref'`);
        }
        return {type: parts[1], id: parts[2]};
    }

    convertJSValueToDocValue(thing: any, mapping: PropertyMapping) {
        if (mapping == null || isUndefined(mapping)) {
            throw new Error(`Trying to 'convert_from_js_value_to_db_value' but got ${mapping} for the mapping`);
        }
        if (thing == null || isUndefined(thing)) {
            return thing;
        }
        if (mapping.hint == PropertyHint.Date) {
            if (!(thing instanceof Date)) {
                throw new Error(`Could not convert ${thing} into a formatted date, for property: ${mapping.name}. It's not a Date object, rather it's a ${thing}`);
            }
            return thing.toISOString();
        }
        return thing;
    }

    convertDocValueToJSValue(value: string, mapping: PropertyMapping) {
        if (mapping == null || isUndefined(mapping)) {
            throw new Error(`Trying to 'convert_from_db_value_to_js_type' for property ${value} but got ${mapping} for the mapping`);
        }
        if (mapping.hint == PropertyHint.Date) {
            let a_date = moment(value);
            if (!a_date.isValid()) {
                throw new Error(`Could not parse ${value} into a Date. For property: ${mapping.name}`);
            }
            return a_date.toDate();
        }
        return value;
    }

    describeHints(mapping: PropertyMapping) {
        if (mapping.hint) {
            return mapping.hint;
        }
        return "none";
    }

}

export {
    OrmMapper,
    GetTheTypeNameOfTheObject,
}