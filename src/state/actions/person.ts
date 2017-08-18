import {Injectable} from "@angular/core";
import {NgRedux} from "@angular-redux/store";
import {IAppState} from "../app";
import {IPerson} from "../reducers/people";

@Injectable()
export class PersonActions {
    static ADD_UNAVAILABLE: string = "person/ADD_UNAVAILABLE";
    static REMOVE_UNAVAILABLE: string = "person/REMOVE_UNAVAILABLE";
    static ADD_PERSON: string = "ADD_PERSON";
    static REMOVE_PERSON: string = "REMOVE_PERSON";
    static UPDATE_PERSON: string = "UPDATE_PERSON";

    constructor(private ngRedux: NgRedux<IAppState>) {

    }

    addPerson(person: IPerson) {
        return {
            type: PersonActions.ADD_PERSON,
            payload: person
        }
    }

    removePerson(person: IPerson) {
        return {
            type: PersonActions.REMOVE_PERSON,
            payload: person.uuid
        }
    }

    updatePerson(person: IPerson) {
        return {
            type: PersonActions.UPDATE_PERSON,
            payload: person
        }
    }

    addUnavailability(person: IPerson, date: Date) {
        return {
            type: PersonActions.ADD_UNAVAILABLE,
            uuid: person.uuid,
            payload: date
        }
    }

    removeUnavailability(person: IPerson, date: Date) {
        return {
            type: PersonActions.REMOVE_UNAVAILABLE,
            uuid: person.uuid,
            payload: date
        }
    }
}