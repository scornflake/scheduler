import {NgRedux} from "@angular-redux/store";
import {combineReducers} from "redux";
import {IPerson, peopleReducer} from "./reducers/people";

export interface IAppState {
    people: IPerson[]
}

let reducers = combineReducers<IAppState>({
    people: peopleReducer
});

let enhancers = [];
let middleware = [];

export default function configureReduxStore(ngRedux: NgRedux<IAppState>) {
    ngRedux.configureStore(reducers, <IAppState>{}, middleware, enhancers);
}