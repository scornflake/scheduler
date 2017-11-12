import {AnyAction} from "redux";
import {PersonActions} from "../actions/person";

export type IAllPersons = Map<string, IPerson>;

export interface IPerson {
    uuid: string,
    name: string,
    unavailable: Array<Date>;
}

let defaultPersonState: IPerson = {
    uuid: "0",
    name: "",
    unavailable: []
};
let defaultPersons: IAllPersons = new Map<string, IPerson>();

export let personReducer = (state: IPerson = defaultPersonState, action: AnyAction): IPerson => {
        let newPerson: IPerson;
        switch (action.type) {
            case PersonActions.ADD_UNAVAILABLE:
                newPerson = {
                    ...state,
                    unavailable: [
                        ...state.unavailable,
                        ...[action.payload]
                    ]
                };
                return newPerson;

            case PersonActions.REMOVE_UNAVAILABLE:
                let index = state.unavailable.indexOf(action.payload);
                if (index != -1) {
                    return {
                        ...state,
                        unavailable:
                            [
                                ...state.unavailable.slice(0, index),
                                ...state.unavailable.slice(index + 1)
                            ]
                    };
                }
                return state;
        }
        return state;
    }
;

export let peopleReducer = (state: IAllPersons = defaultPersons, action: AnyAction): IAllPersons => {
        if (action.type.startsWith("person/")) {
            let uuid = action.uuid;
            if (uuid == null) {
                throw Error("No UUID specified when executing: " + action);
            }

            let person: IPerson = state.get(uuid);
            let newState = Object.assign({}, state);
            newState[uuid] = personReducer(person, action);
            return newState;
        }

        switch (action.type) {
            case PersonActions.ADD_PERSON:
            case PersonActions.UPDATE_PERSON:
                let person: IPerson = action.payload;
                return {
                    ...state,
                    [person.uuid]: person,
                };

            case PersonActions.REMOVE_PERSON:
                let new_state = Object.assign({}, state);
                delete  new_state[action.uuid];
                return new_state;
        }
    }
;