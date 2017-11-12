import {AnyAction} from "redux";
import {PersonActions} from "../actions/person";
import {isUndefined} from "ionic-angular/util/util";

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
            // console.log("Modify: " + JSON.stringify(state));
            newPerson = {
                ...state,
                unavailable: [
                    ...state.unavailable,
                    ...[action.payload]
                ]
            };
            // console.log("Modify (returning): " + JSON.stringify(newPerson));
            return newPerson;

        case PersonActions.REMOVE_UNAVAILABLE:
            let unwanted_date = action.payload;
            // console.log("Remove " + action.payload + " from unavail dates");
            let new_dates = state.unavailable.filter(v => {
                return !v == unwanted_date;
            });
            return {
                ...state,
                unavailable: new_dates
            };
    }
    return state;
};


export let peopleReducer = (state: IAllPersons = defaultPersons, action: AnyAction): IAllPersons => {
        if (action.type.startsWith("person/")) {
            let uuid = action.uuid;
            if (uuid == null || isUndefined(uuid)) {
                throw Error("No UUID specified when executing: " + action);
            }

            // console.log("Updating person with UUID: " + uuid);
            // console.log("State before: " + JSON.stringify(state));

            let person: IPerson = state[uuid];
            // console.log("'before' state is: " + JSON.stringify(person));

            let newState = new Map<string, IPerson>(state);
            newState[uuid] = personReducer(person, action);
            // console.log("New state for this UUID:" + JSON.stringify(newState[uuid]));
            // console.log("Type after1: " + newState);
            return newState;
        }

        switch (action.type) {
            case PersonActions.ADD_PERSON:
            case PersonActions.UPDATE_PERSON:
                let person: IPerson = action.payload;
                let newState = new Map<string, IPerson>(state);
                newState[person.uuid] = person;
                return newState;

            case PersonActions.REMOVE_PERSON:
                let new_state = Object.assign({}, state);
                delete new_state[action.uuid];
                return new_state;
        }
    }
;