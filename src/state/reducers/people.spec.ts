import Immutable from 'immutable';
import {IAllPersons, IPerson, peopleReducer} from "./people";
import {PersonActions} from "../actions/person";
import {MockNgRedux} from "@angular-redux/store/lib/testing";
import {addJasmineMatchers} from "../../utils/jasmine-matchers";

describe('people, ', () => {
    let firstPerson: IPerson = {
        uuid: '1234',
        name: 'neilos',
        unavailable: Immutable.List<Date>()
    };

    let state: IAllPersons;

    let reducer = peopleReducer;
    let actions = new PersonActions(MockNgRedux.getInstance());
    let someDate: Date = new Date(2010, 10, 3);

    beforeEach(() => {
        addJasmineMatchers();
        state = Immutable.Map({'1234': firstPerson});
    });

    it('can be unavailable', () => {
        let expectedPerson: IPerson = {
            ...firstPerson,
            unavailable: Immutable.List<Date>([someDate])
        };
        let expected: IAllPersons = Immutable.Map<string, IPerson>().set(expectedPerson.uuid, expectedPerson);
        let stateAfter = reducer(state, actions.addUnavailability(firstPerson, someDate));
        expect(
            stateAfter
        ).toEqualImmutable(expected)
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
            unavailable: Immutable.List<Date>()
        };

        let expected: IAllPersons = Immutable.Map<string, IPerson>();
        expected[firstPerson.uuid] = firstPerson;
        expected[newPerson.uuid] = newPerson;
        expect(reducer(state, actions.addPerson(newPerson)))
            .toEqual(expected)
    });

});