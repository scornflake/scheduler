import {
    IArrayChange,
    IArraySplice,
    IMapDidChange,
    IObjectDidChange,
    isObservableArray,
    IValueDidChange,
    observe
} from "mobx";
import {ObjectWithUUID, TypedObject} from "../../scheduling/base-types";
import {Logger, LoggingService} from "ionic-logging-service";
import {isUndefined} from "util";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {Subject} from "rxjs/Subject";
import {GetTheTypeNameOfTheObject, OrmMapper} from "./orm-mapper";
import {MappingType, NameForMappingPropType, PropertyMapping} from "./orm-mapper-type";

type ObjectChange = { owner: ObjectWithUUID, change: IMapDidChange<any> | IArraySplice<any> | IArrayChange<any> | IObjectDidChange | IValueDidChange<any>, type: string, path: string, propertyName: string };
type ChangeListener = (change: ObjectChange) => void;

function chainListeners(first: ChangeListener, next: ChangeListener): ChangeListener {
    return (change: ObjectChange) => {
        first(change);
        next(change);
    }
}

const defaultLoggingChangeListener: ChangeListener = (aChange) => {
    /*
    Presume it is an IObjectDidChange
     */
    let path = aChange.path;
    let owner = aChange.owner;
    let change = aChange.change;

    let msg = `Change detected (${change.type}), ${path} of owner id:${owner.type}/${owner.uuid}`;
    switch (change.type) {
        case "add": {
            msg += `, new value: ${change.newValue}`;
            break;
        }
        case "update": {
            msg += `, update ${change.oldValue} => ${change.newValue}`;
            break;
        }
        case "remove": {
            msg += `, removed ${change.oldValue}`;
            break;
        }
        case "splice": {
            msg += `, added ${change.addedCount}, removed ${change.removedCount}`;
            break;
        }
        default: {
            msg += ` UNKNOWN TYPE - Change is: ${SWBSafeJSON.stringify(change)}`;
        }
    }
    console.debug(msg);
};


class ObjectChangeTracker {
    changes: Subject<ObjectChange>;

    private tracked_objects_by_uuid = new Map<string, object>();

    // Maps instance => property name => disposer
    private tracked_object_disposers = new Map<object, Map<string, any>>();

    private tracking_disabled = new Map<string, boolean>();
    private changed_objects = new Map<string, object>();
    private logger: Logger;
    private nesting: number = 0;
    private notification_listener: ChangeListener;
    private mapper: OrmMapper;

    constructor(mapper: OrmMapper, logService: LoggingService) {
        this.mapper = mapper;
        this.logger = logService.getLogger("db.tracking");

        this.clearAll();

        this.notification_listener = (change: ObjectChange) => {
            defaultLoggingChangeListener(change);
            this.changes.next(change);
        };
    }

    clearAll() {
        this.changes = new Subject<ObjectChange>();
        this.changed_objects = new Map<string, object>();
        this.tracked_objects_by_uuid = new Map<string, object>();
        this.tracking_disabled = new Map<string, boolean>();
        this.tracked_object_disposers.forEach((disposableProperties, object) => {
            this.clearDisposersForObject(object);
        });
        this.tracked_object_disposers = new Map<object, any>();
        this.nesting = 0;
    }

    private clearDisposersForObject(object) {
        let propertiesMap = this.tracked_object_disposers.get(object);
        if (propertiesMap) {
            propertiesMap.forEach((disposer, propertyName) => {
                if (disposer) {
                    if (object instanceof TypedObject) {
                        this.tracking_trace(`Removing observer for ${object.type}.${propertyName}`);
                    }
                    disposer();
                }
            });
            this.tracked_object_disposers.delete(object);
        }
    }

    /*
        Walk the tree... we will track:
        - Properties of the passed in object
        - Any change to field (or nested field) that is a "nested object"
        - We will ignore any field that is a a reference/reference list
         */
    track(instance: ObjectWithUUID, listener: ChangeListener = null) {
        if (instance == null) {
            throw new Error('Cannot track an instance == null');
        }
        this.nesting = 0;
        if (listener == null) {
            listener = this.notification_listener;
        } else {
            listener = chainListeners(this.notification_listener, listener);
        }
        if (!instance.constructor) {
            throw new Error(`Cannot find path on object, can't track properties. Instance.constructor is null. What to do?`);
        }
        this.trackPropertiesOfObject(instance, instance, instance.type, listener);
        this.tracking_debug(`Done installing change listener for ${instance.type}`);
    }

    getChangedObjects(): Map<string, object> {
        return new Map<string, object>(this.changed_objects);
    }

    clearChangedObjects() {
        if (this.changed_objects.size > 0) {
            this.logger.info(`Cleared ${this.changed_objects.size} changed objects`);
            this.changed_objects.clear();
        }
    }

    untrack(object: ObjectWithUUID) {
        if (object == null || isUndefined(object)) {
            return;
        }
        // er, can't unobserve?
        this.clearDisposersForObject(object);
        this.changed_objects.delete(object.uuid);
        this.tracked_objects_by_uuid.delete(object.uuid);
    }

    get ignored(): string[] {
        return ["type", "_id", "_rev", "rev", "id"];
    }

    shouldBeIgnored(propertyName: string) {
        return this.ignored.indexOf(propertyName) != -1;
    }

    private trackFieldsOfObject(owner: ObjectWithUUID, instance: any, parent_path: string, listener: ChangeListener) {
        if (instance == null) {
            throw new Error('Cannot trackFieldsOfObject for instance == null');
        }
        if (!instance.constructor) {
            throw new Error('Cannot trackFieldsOfObject for instance.constructor being undefined/null');
        }
        if (!(instance instanceof TypedObject)) {
            throw new Error('Cannot trackFieldsOfObject for instance that doesnt derive from TypedObject');
        }

        let props: Map<string, PropertyMapping>;
        try {
            props = this.mapper.propertiesFor(instance.type);
            if (!props) {
                this.tracking_trace(`no further properties to track on ${parent_path}`);
                return;
            }
        } catch (err) {
            throw new Error(`Cannot get properties in order to track object. Owner ID ${owner.uuid}, parent: ${parent_path}. Original error: ${err}`);
        }

        // Right, if any of these properties change, that means 'owner' has changed.
        // If any of the properties are ObjectWithUUID, start the tracking again with THAT object as the owner.
        let all_properties = Object.keys(instance);
        props.forEach((mapping, propertyName) => {
            let childPath = `${parent_path}.${propertyName}`;
            let actualPropertyName = mapping.privateName || propertyName;
            try {
                if (this.shouldBeIgnored(propertyName)) {
                    return;
                }
                /*
                Very careful here: get the underlying property.
                Don't go through an accessor (e.g: Person.availability, etc).
                 */
                let value = instance[actualPropertyName];
                let type = mapping.type;
                let typeName = NameForMappingPropType(type);

                if (type == MappingType.Property || type == MappingType.Reference) {
                    // Simple property
                    this.tracking_debug(`consider property ${typeName}, ${childPath} (using ${actualPropertyName})`);
                    this.installObserverForPropertyNamed(owner, instance, parent_path, actualPropertyName, listener);
                } else if (type == MappingType.NestedObject) {
                    this.tracking_debug(`consider nested object ${typeName}, ${childPath} (using ${actualPropertyName})`);
                    this.installObserverForPropertyNamed(owner, instance, parent_path, actualPropertyName, listener);
                    this.trackPropertiesOfObject(owner, value, childPath, listener);
                } else if (type == MappingType.NestedObjectList || type == MappingType.ReferenceList) {
                    this.tracking_debug(`consider nested object list ${typeName}, ${childPath} (using ${actualPropertyName})`);

                    // Track the members of the list
                    if (type == MappingType.NestedObjectList) {
                        value.forEach((v, idx) => {
                            let element_path = `${childPath}[${idx}]`;
                            this.trackPropertiesOfObject(owner, v, element_path, listener);
                        });
                    }

                    // Track the list itself
                    //    Important: If you use an accessor, mobx will return a REAL LIST.  Which isn't what we want, since we need to be able to observe it.
                    //    and it seems you cannot observe lists (you CAN observe ObservableArrays tho)
                    //    By getting the actual underlying property value directly, we end up getting the ObservableList.
                    this.tracking_debug(`consider list itself: ${childPath}`);
                    this.installObserverDirectlyOn(owner, value, childPath, listener);
                } else if (type == MappingType.MapWithReferenceKeys || type == MappingType.MapWithReferenceValues) {
                    // Track the map itself
                    this.tracking_debug(`consider map itself: ${childPath}`);
                    this.installObserverDirectlyOn(owner, value, childPath, listener);
                }
            } catch (ex) {
                throw new Error(`Cannot track ${actualPropertyName} on ${childPath}. Does it have an @observable decorator? Type is: ${typeof instance}. ` +
                    `All properties: ${JSON.stringify(all_properties)}, ${ex}`);
            }
        });
    }

    gap(width: number): string {
        return " ".repeat(width);
    }

    tracking_trace(message) {
        this.logger.trace(`${this.gap(this.nesting)}${message}`);
    }

    tracking_debug(message) {
        this.logger.debug(`${this.gap(this.nesting)}${message}`);
    }

    // Tracks the properties of this object
    private trackPropertiesOfObject(owner: ObjectWithUUID, instance: any, path: string, listener: ChangeListener) {
        if (instance instanceof ObjectWithUUID) {
            if (this.tracked_objects_by_uuid.has(instance.uuid)) {
                // this.tracking_debug(`Stopping @ ${path}, with instance ${instance.constructor.name}. It's an ObjectWithUUID and is already tracked`);
            }
        } else {
            // Can't check ... install regardless
            // This is OK. It'll just mean that if this object changes, we notify with the owner (so, the owner 'owns' this instance).
            // This is so an owner that is an ObjectWithUUID can own POJO's
        }

        this.nesting++;
        try {
            this.trackFieldsOfObject(owner, instance, path, listener);
        } finally {
            this.nesting--;
        }
    }

    private installObserverDirectlyOn(owner: ObjectWithUUID, instance: any, parentPath: string, listener: ChangeListener) {
        if (instance == null) {
            throw new Error('Cant install a change listener on null!');
        }
        let nameOfTheObject = GetTheTypeNameOfTheObject(instance);
        if (nameOfTheObject == 'array') {
            this.tracking_trace(`Install change listener for: ${parentPath} (Array of ${instance.length})`);
            if (!isObservableArray(instance)) {
                this.tracking_trace(`${parentPath} isn't an Observable array - this is going to fail?`);
            }
        } else if (nameOfTheObject == 'map') {
            this.tracking_trace(`Install change listener for: ${parentPath} (Map of ${instance.size})`);
        } else {
            // Right now this is ONLY here so we can put in some decent logging for trace.
            // We can actually, I think, track non-TypedObjects, just we cannot refer to constructor.name when --prod --aot in place
            // Uglify will change the constructor names.
            if (!(instance instanceof TypedObject)) {
                throw new Error(`Cannot installObserverDirectlyOn for instance that doesn't derive from TypedObject`);
            }
            this.tracking_trace(`Install change listener for: ${parentPath} (${instance}/${instance.type})`);
        }

        let propertyName = 'items';
        let disposersForInstance = this.tracked_object_disposers.get(instance);
        if (disposersForInstance) {
            if (disposersForInstance.get(propertyName)) {
                this.tracking_trace(`We've already installed an observer for '${propertyName}' on this ${nameOfTheObject} instance`);
                return;
            }
        } else {
            disposersForInstance = new Map<string, any>();
            this.tracked_object_disposers.set(instance, disposersForInstance);
        }

        let disposer = observe(instance, this.changeListenerFor.bind(this)(owner, parentPath, propertyName, listener), false);
        disposersForInstance.set(propertyName, disposer);

        this.tracked_objects_by_uuid.set(owner.uuid, owner);
    }

    getNameForInstance(instance) {
        if (typeof instance === 'object') {
            let parts = [];
            if (instance != null) {
                parts.push(instance);
                if (instance instanceof TypedObject) {
                    parts.push(instance.type)
                } else if (instance.constructor != null) {
                    throw new Error(`Trying to get type using instance.constructor.name isnt supported. --prod/--aot will munge the names.`);
                    // parts.push(instance.constructor.name);
                }
            }
            return parts.join("/");
        }
        return "<dunno>";
    }

    private installObserverForPropertyNamed(owner: ObjectWithUUID, instance: any, parentPath: string, propertyName: string, listener: ChangeListener) {
        if (instance == null) {
            throw new Error('Cannot installObserverForPropertyNamed for instance == null');
        }
        let disposersForInstance = this.tracked_object_disposers.get(instance);
        if (disposersForInstance) {
            if (disposersForInstance.get(propertyName)) {
                this.tracking_trace(`We've already installed an observer for ${propertyName} on this instance`);
                return;
            }
        } else {
            disposersForInstance = new Map<string, any>();
            this.tracked_object_disposers.set(instance, disposersForInstance);
        }

        this.tracking_trace(`install change listener for: ${parentPath}.${propertyName} (${this.getNameForInstance(instance)})`);

        let disposer = observe(instance, this.changeListenerFor.bind(this)(owner, parentPath, propertyName, listener), false);
        disposersForInstance.set(propertyName, disposer);
        this.tracked_objects_by_uuid.set(owner.uuid, owner);
    }

    private changeListenerFor(owner, parentPath, propertyName, listener) {
        return (change) => {
            /*
            Ignore changes to _rev, _id and type
             */
            if (change) {
                if (change['name']) {
                    if (this.shouldBeIgnored(change['name'])) {
                        return;
                    }
                }
            }

            if (this.tracking_disabled.get(owner.uuid)) {
                this.tracking_trace(`ignore change for ${owner.uuid}, tracking disabled`);
                return;
            }

            // Record that this object has changed (doesn't record the ACTUAL change, but the root owner)
            // Intention is that if you wanted, you can get all changed objects and save them. You'd be saving each ROOT object, which would save it's nested objects
            // thus picking up all changes
            if (owner) {
                this.changed_objects.set(owner.uuid, owner);
            }

            // Notify, side effect is that we emit from our subject
            listener({owner: owner, change: change, type: "object", path: parentPath, propertyName: propertyName});
        };
    }

    clearChangesFor(owner: ObjectWithUUID) {
        this.changed_objects.delete(owner.uuid);
    }

    disableTrackingFor(objectOrUUID: ObjectWithUUID | string) {
        if (objectOrUUID instanceof ObjectWithUUID) {
            this.tracking_disabled.set(objectOrUUID.uuid, true);
        } else {
            this.tracking_disabled.set(objectOrUUID, true);
        }
    }

    enableTrackingFor(objectOrUUID: ObjectWithUUID | string) {
        if (objectOrUUID instanceof ObjectWithUUID) {
            this.tracking_disabled.delete(objectOrUUID.uuid);
        } else {
            this.tracking_disabled.delete(objectOrUUID);
        }
    }
}

export {
    ObjectChangeTracker,
    ObjectChange,
    ChangeListener
}
