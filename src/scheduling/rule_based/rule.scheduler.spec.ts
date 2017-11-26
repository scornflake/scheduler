import {OnThisDate, PickRule, PickRules, RuleState, UsageWeightedSequential} from "./rules";
import {PeopleStore, Person} from "../../state/people";
import {Role} from "../../state/roles";

describe('rules', () => {
    let store = new PeopleStore();
    let state;
    let p1, p2, p3: Person;
    let date: Date;

    beforeEach(() => {
        store = new PeopleStore();
        state = new RuleState();

        // If we have people in order, it just returns sequentially
        p1 = store.addPerson(new Person("Neil"));
        p2 = store.addPerson(new Person("Bob"));
        p3 = store.addPerson(new Person("Tim"));

        date = new Date(2010, 10, 0);
        state.date = date;
    });

    it('simple sequential', () => {
        // If we have people in order, it just returns sequentially
        let uw = new UsageWeightedSequential(store.people);

        expect(uw.execute(state).next().value).toEqual(p1);
        uw.use_this_person(p1);

        expect(uw.execute(state).next().value).toEqual(p2);
        uw.use_this_person(p2);

        expect(uw.execute(state).next().value).toEqual(p3);
        uw.use_this_person(p3);

        expect(uw.execute(state).next().value).toEqual(p1);
    });

    it('on this date rule', () => {
        let dateRule = new OnThisDate(date, store.people[0]);

        // Execute for this date. Should work.
        let iterator = dateRule.execute(state);
        expect(iterator.next().value).toEqual(store.people[0]);
        expect(iterator.next().value).toEqual(null);

        // Do it for a different date that doesn't match, shouldn't come back with anything.
        state.date = new Date(2012, 1, 2);
        iterator = dateRule.execute(state);
        expect(iterator.next().value).toEqual(null);
    });


    it('test unavailable', () => {
        let uw = new UsageWeightedSequential(store.people);

        let series_of_people = uw.execute(state);

        // Lets say p1 isn't available (so we don't call increment)
        expect(series_of_people.next().value).toEqual(p1);

        expect(series_of_people.next().value).toEqual(p2);
        // We DO use p2.
        uw.use_this_person(p2);

        // Now when we come to do this again, we want to see p1 first
        series_of_people = uw.execute(state);
        expect(series_of_people.next().value).toEqual(p1);

        // then p3 (because p2 was used, above)
        expect(series_of_people.next().value).toEqual(p3);

        // THEN p2
        expect(series_of_people.next().value).toEqual(p2);
    });

    it('a group of one rule looks like it has just one rule', () => {
        let rules = new PickRules();
        let dateRule = new OnThisDate(date, p3, 5);
        rules.addRule(dateRule);

        let iterator = rules.execute(state);
        expect(iterator.next().value).toEqual(p3);
        expect(iterator.next().value).toEqual(null);
    });

    it('can execute many rules', () => {
        let rules = new PickRules();

        // Means: choose Tim on date 'date'
        let dateRule = new OnThisDate(date, p3, 5);

        // Means, use weighted sequential (Neil, Bob, Tim).
        let uw = new UsageWeightedSequential(store.people, 1);
        rules.addRule(uw);
        rules.addRule(dateRule);

        // Running on date = date, should get Tim, Neil, Bob, Tim
        let iterator = rules.execute(state);
        expect(iterator.next().value).toEqual(p3);
        expect(iterator.next().value).toEqual(p1);
        expect(iterator.next().value).toEqual(p2);
        expect(iterator.next().value).toEqual(p3);
        expect(iterator.next().value).toEqual(null);
    });

});