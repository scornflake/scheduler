import {Injectable} from "@angular/core";
import {NgRedux} from "@angular-redux/store";
import {IAppState} from "../app";

@Injectable()
export class PersonActions {
    static ADD_UNAVAILABLE: string = "ADD_UNAVAILABLE";
    static REMOVE_UNAVAILABLE: string = "REMOVE_UNAVAILABLE";

    constructor(private ngRedux: NgRedux<IAppState>) {

    }

    addUnavailability(date: Date) {
        return {
            type: PersonActions.ADD_UNAVAILABLE,
            date: date
        }
    }

    removeUnavailability(date: Date) {
        return {
            type: PersonActions.REMOVE_UNAVAILABLE,
            date: date
        }
    }
}