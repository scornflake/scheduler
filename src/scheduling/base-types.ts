import {action, observable} from "mobx-angular";

abstract class TypedObject {
    @observable type: string;

    constructor() {
        /*
        Note: this fails if uglify 'keep_fnames' is false (the default).
        While a workaround might be to have createNewInstanceOfType forcibly set the type
        after instantiation, this doesn't work for newly instantiated types.

        Solution: Use a custom Uglify.config.js.
        for Ionic, this can be setup as part of the "config" in package.json.
        e.g:
          "config": {
            "ionic_copy": "./config/copy.config.js",
            "ionic_uglifyjs": "./config/uglify.config.js"
          }

        And then have:
            keep_fnames: true

        at the root level of uglify.config.js
         */
        this.type = this.constructor.name;
    }

    isEqual(obj: object): boolean {
        if (obj == null) {
            return false;
        }
        if (!(obj instanceof TypedObject)) {
            return false;
        }
        return this.type == obj.type;
    }

    @action setType(type: string) {
        this.type = type;
    }
}

abstract class ObjectWithUUID extends TypedObject {
    @observable _id: string;
    @observable _rev: string;
    @observable is_new: boolean;

    constructor(uuid: string = null) {
        super();
        if (uuid == null) {
            uuid = ObjectWithUUID.guid();
        }
        this.is_new = true;
        this._id = uuid;
    }

    @action setId(id: string) {
        this._id = id;
    }

    @action setIsNew(flag: boolean) {
        this.is_new = flag;
    }

    @action setRev(revision: string) {
        this._rev = revision;
    }

    isEqual(obj: object): boolean {
        if (!super.isEqual(obj)) {
            return false;
        }
        if (obj instanceof ObjectWithUUID) {
            return this._id == obj._id && this._rev == obj._rev;
        }
    }

    static guid() {
        return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' +
            this.s4() + '-' + this.s4() + this.s4() + this.s4();
    }

    static s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    get uuid(): string {
        return this._id;
    }

    @action update_from_server(state) {
        let fields = [];
        // migrate properties to this
        if (state._id) {
            this._id = state['_id'];
            fields.push("_id");
        }
        if (state._rev) {
            this._rev = state['_rev'];
            fields.push("_rev");
        }
        this.is_new = false;
        return fields;
    }

    @action undefineIdAndRev() {
        this._id = undefined;
        this._rev = undefined;
    }
}

class NamedObject extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string = "", uuid: string = null) {
        super(uuid);
        this.name = name;
    }

    @action setName(name: string) {
        this.name = name;
    }

    valueOf() {
        if (this != null) {
            return this.name;
        }
        return "";
    }

    toString() {
        return this.valueOf();
    }

    static sortByName<T extends NamedObject>(list: Array<T>): Array<T> {
        return list.slice().sort((a, b) => {
            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                return 1;
            }
            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                return -1;
            }
            return 0;
        });
    }
}

export {TypedObject};
export {ObjectWithUUID};
export {NamedObject};
