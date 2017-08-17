import {IPerson, peopleReducer} from "./people";
import {PersonActions} from "../actions/person";
import {MockNgRedux} from "@angular-redux/store/lib/testing";

describe('people, ', () => {
    let person: IPerson = {
        name: 'neilos',
        unavailable: []
    };

    let reducer = peopleReducer;
    let personActions = new PersonActions(MockNgRedux.getInstance());
    let someDate: Date = new Date(2010, 10, 3);

    it('can be unavailable', () => {
        expect(
            reducer(person, personActions.addUnavailability(someDate))
        ).toEqual(
            {
                name: 'neilos',
                unavailable: [
                    someDate
                ]
            }
        )
    });

    it('can remove unavailable date', () => {
        let unavailablePerson = reducer(person, personActions.addUnavailability(someDate));

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        expect(
            reducer(unavailablePerson, personActions.removeUnavailability(recreatedDate))
        ).toEqual(person);
    });

});