import {NgRedux} from "@angular-redux/store";
import {combineReducers} from "redux";
import {IAllPersons, peopleReducer} from "./reducers/people";
import {roleReducer} from "./reducers/roles";

export interface IAppState {
    people: IAllPersons
}

let reducers = combineReducers<IAppState>({
    people: peopleReducer,
    roles: roleReducer
});

let enhancers = [];
let middleware = [];

export default function configureReduxStore(ngRedux: NgRedux<IAppState>) {
    ngRedux.configureStore(reducers, <IAppState>{}, middleware, enhancers);
}