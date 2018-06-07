import {IArrayChange, IArraySplice, IMapDidChange, IObjectDidChange, IValueDidChange, observe} from "mobx";
import {ObjectWithUUID} from "../../scheduling/common/base_model";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {isUndefined} from "util";
import {PersistenceProperty, propsMetadataKey} from "./db-decorators";
import {PersistenceType} from "./db-types";
import {SafeJSON} from "../../common/json/safe-stringify";
import {Subject} from "rxjs/Subject";

type ObjectChange = { owner: ObjectWithUUID, change: IMapDidChange<any> | IArraySplice<any> | IArrayChange<any> | IObjectDidChange | IValueDidChange<any>, type: string, path: string };
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
            msg += ` UNKNOWN TYPE - Change is: ${SafeJSON.stringify(change)}`;
        }
    }
    console.debug(msg);
};


class ObjectChangeTracker {
    changes: Subject<ObjectChange>;

    private tracked_objects = new Map<string, object>();
    private tracking_disabled = new Map<string, boolean>();
    private changed_objects = new Map<string, object>();
    private logger: Logger;
    private nesting: number = 0;
    private notification_listener: ChangeListener;

    constructor() {
        this.logger = LoggingWrapper.getLogger("db.tracking");
        this.changes = new Subject<ObjectChange>();

        this.changed_objects = new Map<string, object>();
        this.notification_listener = (change: ObjectChange) => {
            defaultLoggingChangeListener(change);
            this.changes.next(change);
        };
    }

    /*
    Walk the tree... we will track:
    - Properties of the passed in object
    - Any change to field (or nested field) that is a "nested object"
    - We will ignore any field that is a a reference/reference list
     */
    track(instance: ObjectWithUUID, listener: ChangeListener = null) {
        this.nesting = 0;
        if (listener == null) {
            listener = this.notification_listener;
        } else {
            listener = chainListeners(this.notification_listener, listener);
        }
        this.trackRootObject(instance, instance.constructor.name, listener);
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
        this.changed_objects.delete(object.uuid);
        this.tracked_objects.delete(object.uuid);
    }

    private trackFieldsOfObject(owner: ObjectWithUUID, instance: any, parent_path: string, listener: ChangeListener) {
        let properties: PersistenceProperty[] = Reflect.getMetadata(propsMetadataKey, instance);
        if (!properties) {
            this.tracking_debug(`no further properties to track on ${parent_path}`);
            return;
        }

        properties.forEach(prop => {
            let child_path = `${parent_path}.${prop.name}`;
            let value = instance[prop.name];
            this.tracking_debug(`consider ${child_path}`);
            if (prop.type == PersistenceType.NestedObject) {
                this.trackObject(owner, value, child_path, listener);
            } else if (prop.type == PersistenceType.NestedObjectList) {
                // Track the members of the list
                value.forEach((v, idx) => {
                    let element_path = `${child_path}[${idx}]`;
                    this.trackObject(owner, v, element_path, listener);
                });

                // Track the list itself
                this.trackObject(owner, value, child_path, listener);
            }
        });
    }

    gap(width: number): string {
        return " ".repeat(width);
    }

    tracking_debug(message) {
        this.logger.debug(`${this.gap(this.nesting)}${message}`);
    }

    private trackRootObject(instance: any, path: string, listener: ChangeListener) {
        this.trackObject(instance, instance, path, listener);
    }

    private trackObject(owner: ObjectWithUUID, instance: any, path: string, listener: ChangeListener) {
        if (instance instanceof ObjectWithUUID) {
            if (this.tracked_objects.has(instance.uuid)) {
                return;
            }
            this.install_observer(owner, instance, path, listener);
        } else {
            // Can't check ... install regardless
            this.install_observer(owner, instance, path, listener);
        }


        this.nesting++;
        try {
            this.trackFieldsOfObject(owner, instance, path, listener);
        } finally {
            this.nesting--;
        }
    }

    private install_observer(owner: ObjectWithUUID, instance: object, path: string, listener: ChangeListener) {
        this.tracking_debug(`Install change listener for: ${path} (${instance}/${instance.constructor.name})`);
        observe(instance, (change) => {
            /*
            Ignore changes to '_rev'
             */
            if(change.name == '_rev') {
                return;
            }

            if(this.tracking_disabled.get(owner.uuid)) {
                this.tracking_debug(`ignore change for ${owner.uuid}, tracking disabled`);
                return;
            }

            // Record that this object has changed (doesn't record the ACTUAL change, but the root owner)
            // Intention is that if you wanted, you can get all changed objects and save them. You'd be saving each ROOT object, which would save it's nested objects
            // thus picking up all changes
            if(owner) {
                this.changed_objects.set(owner.uuid, owner);
            }

            // Notify, side effect is that we emit from our subject
            listener({owner: owner, change: change, type: "object", path: path});
        });
    }

    clear_changes_for(owner: ObjectWithUUID) {
        this.changed_objects.delete(owner.uuid);
    }

    disable_tracking_for(object: ObjectWithUUID) {
        if(object) {
            this.tracking_disabled.set(object.uuid, true);
        }
    }

    enable_tracking_for(object: ObjectWithUUID) {
        if(object) {
            this.tracking_disabled.delete(object.uuid);
        }
    }
}

export {
    ObjectChangeTracker,
    ObjectChange,
    ChangeListener
}
