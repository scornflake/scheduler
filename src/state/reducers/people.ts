import Immutable from 'immutable';
import {AnyAction} from "redux";
import {PersonActions} from "../actions/person";

export type IAllPersons = Immutable.Map<string, IPerson>;

export interface IPerson {
    uuid: string,
    name: string;
    unavailable: Immutable.List<Date>;
}

let defaultPersonState: IPerson = {
    uuid: "0",
    name: "",
    unavailable: Immutable.List<Date>()
};
let defaultPersons: IAllPersons = Immutable.Map<string, IPerson>();

export let personReducer = (state: IPerson = defaultPersonState, action: AnyAction): IPerson => {
    let newPerson: IPerson;
    switch (action.type) {
        case PersonActions.ADD_UNAVAILABLE:
            newPerson = Object.assign({}, state);
            newPerson.unavailable = newPerson.unavailable.push(action.payload);
            return newPerson;

        case PersonActions.REMOVE_UNAVAILABLE:
            newPerson = Object.assign({}, state);
            let index = newPerson.unavailable.indexOf(action.payload);
            if (index != -1) {
                newPerson.unavailable = newPerson.unavailable.remove(index);
            }
            return newPerson;
    }
    return state;
};

export let peopleReducer = (state: IAllPersons = defaultPersons, action: AnyAction): IAllPersons => {
        if (action.type.startsWith("person/")) {
            let uuid = action.uuid;
            if (uuid == null) {
                throw Error("No UUID specified when executing: " + action);
            }

            let person: IPerson = state.get(uuid);
            let modifiedPerson: IPerson = personReducer(person, action);
            return state.set(modifiedPerson.uuid, modifiedPerson);
        }

        switch (action.type) {
            case PersonActions.ADD_PERSON:
            case PersonActions.UPDATE_PERSON:
                let person: IPerson = action.payload;
                return state.merge({[person.uuid]: person});

            case PersonActions.REMOVE_PERSON:
                return state.remove(action.payload);
        }
    }
;