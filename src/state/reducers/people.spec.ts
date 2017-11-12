import {IAllPersons, IPerson, peopleReducer} from "./people";
import {PersonActions} from "../actions/person";
import {MockNgRedux} from "@angular-redux/store/lib/testing";

function buildMap(obj) {
    let map = new Map();
    Object.keys(obj).forEach(key => {
        map.set(key, obj[key]);
    });
    return map;
}

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
    let expected: IAllPersons = new Map<string, IPerson>();

    beforeEach(() => {
        state = new Map<string, IPerson>();
        state['1234'] = firstPerson;
    });

    it('can add unavailable date', () => {
        let expectedPerson: IPerson = {
            ...firstPerson,
            unavailable: [someDate]
        };
        expected[expectedPerson.uuid] = expectedPerson;

        let allPersons = reducer(state, PersonActions.addUnavailability(firstPerson, someDate));
        // console.log("Pre State: " + JSON.stringify(state));
        // console.log("All State: " + JSON.stringify(allPersons));
        expect(allPersons["1234"]).toEqual(expectedPerson)
    });


    it('can remove unavailable date', () => {
        let personsWithAnUnavailabilityDate = reducer(state, PersonActions.addUnavailability(firstPerson, someDate));

        // a new date instance
        let recreatedDate = new Date(2010, 10, 3);
        let allPersons = expect(
            reducer(personsWithAnUnavailabilityDate, PersonActions.removeUnavailability(firstPerson, recreatedDate))
        );
        expect(allPersons.toEqual(state));
    });

    it('can add to people', () => {
        let newPerson: IPerson = {
            uuid: '4321',
            name: 'john',
            unavailable: []
        };

        let expected: IAllPersons = new Map<string, IPerson>();
        expected[newPerson.uuid] = newPerson;
        expect(reducer(state, PersonActions.addPerson(newPerson)))
            .toEqual(expected)
    });

});