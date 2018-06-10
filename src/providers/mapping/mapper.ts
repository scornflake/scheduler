import {PersistenceType} from "../server/db-types";
import {isUndefined} from "util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {CreateNewObjectOfType, RegisteredClassFactories} from "../server/db-decorators";
import {SafeJSON} from "../../common/json/safe-stringify";

type PropertyMapping = {
    name: string,
    type?: PersistenceType, // if not specified == PersistenceType.Property
}

type ClassMapping = {
    name: string;
    fields?: PropertyMapping[],
    inherit?: string,
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

class Mapper {
    definitions: Map<string, ClassMapping>;
    private logger: Logger;

    constructor() {
        this.logger = LoggingWrapper.getLogger('db.mapping');
        this.definitions = new Map<string, ClassMapping>();
        this.add_configuration(internal_mappings, false);
    }

    add_configuration(map: ClassFieldMapping, verify_property_names: boolean = true) {
        if (!map) {
            throw new Error("No map provided - wot yo do?");
        }
        map.classes.forEach(cm => {
            // We use this to verify the fields.
            let actual_instance = null;
            let actual_properties = [];
            if (verify_property_names) {
                try {
                    actual_instance = CreateNewObjectOfType(cm.name);
                } catch(e) {
                    throw new Error(`${e}. Is the class spelt correctly in the mapping configuration? Does it exist?`);
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
}

export {
    Mapper,
    ClassFieldMapping,
    ClassMapping
}