import {NgRedux} from "@angular-redux/store";
import {combineReducers} from "redux";
import {IAllPersons, peopleReducer} from "./reducers/people";

export interface IAppState {
    people: IAllPersons
}

let reducers = combineReducers<IAppState>({
    people: peopleReducer
});

let enhancers = [];
let middleware = [];

export default function configureReduxStore(ngRedux: NgRedux<IAppState>) {
    ngRedux.configureStore(reducers, <IAppState>{}, middleware, enhancers);
}