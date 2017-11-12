// import Immutable from 'immutable';
import {IAllPersons, IPerson, peopleReducer} from "./people";
import {PersonActions} from "../actions/person";
import {MockNgRedux} from "@angular-redux/store/lib/testing";
// import {addJasmineMatchers} from "../../utils/jasmine-matchers";
// import * as matchers from "jasmine-immutable-matchers";

describe('people, ', () => {
    let firstPerson: IPerson = {
        uuid: '1234',
        name: 'neilos',
        unavailable: []
    };

    let state: IAllPersons;

    let reducer = peopleReducer;
    let actions = new PersonActions(MockNgRedux.getInstance());
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        // addJasmineMatchers();
        // jasmine.addMatchers(matchers);
        state = {'1234': firstPerson};
    });

    it('can be unavailable', () => {
        let expectedPerson: IPerson = {
            ...firstPerson,
            unavailable: [someDate]
        };
        let expected: IAllPersons;
        expected[expectedPerson.uuid] = expectedPerson;
        expect(
            reducer(state, actions.addUnavailability(firstPerson, someDate))
        ).toEqual(expected)
    });

    xit('can remove unavailable date', () => {
        let unavailablePerson = reducer(state, actions.addUnavailability(firstPerson, someDate));

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        expect(
            reducer(unavailablePerson, actions.removeUnavailability(firstPerson, recreatedDate))
        ).toEqual(state);
    });

    xit('can add to people', () => {
        let newPerson: IPerson = {
            uuid: '4321',
            name: 'john',
            unavailable: []
        };

        let expected: IAllPersons = {};
        expected[firstPerson.uuid] = firstPerson;
        expected[newPerson.uuid] = newPerson;
        expect(reducer(state, actions.addPerson(newPerson)))
            .toEqual(expected)
    });

});