import {AnyAction} from "redux";
import {PersonActions} from "../actions/person";

export interface IPerson {
    name: string;
    unavailable: Date[];
}

let defaultState: IPerson = {
    name: "",
    unavailable: []
};

export let peopleReducer = (state: IPerson = defaultState, action: AnyAction): IPerson => {
    switch (action.type) {
        case PersonActions.ADD_UNAVAILABLE:
            return {
                ...state,
                unavailable: [
                    ...state['unavailable'], action.date
                ]
            };

        case PersonActions.REMOVE_UNAVAILABLE:
            return {
                ...state,
                unavailable: state.unavailable.filter((d) => {
                    return d.getTime() !== action.date.getTime();
                })
            }
    }
    return state;
};