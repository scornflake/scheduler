import {observable} from "mobx-angular";

abstract class TypedObject {
    @observable type: string;

    constructor() {
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

    update_from_server(state) {
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
}

class NamedObject extends ObjectWithUUID {
    @observable name: string;

    constructor(name: string = "") {
        super();
        this.name = name;
    }

    valueOf() {
        return this.name;
    }

    toString() {
        return this.valueOf();
    }

    static sortByName<T extends NamedObject>(list: Array<T>): Array<T> {
        return list.sort((a, b) => {
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
