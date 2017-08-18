import Immutable from 'immutable';

declare namespace jasmine {
    interface Matchers<T> {
        toBeImmutable(): boolean;

        toEqualImmutable(expected: T): boolean;
    }
}


export let addJasmineMatchers = () => {
    jasmine.addMatchers({
        toBeImmutable: function () {
            return {
                compare: function (actual, expected) {
                    return {pass: Immutable.Iterable.isIterable(actual)};
                }
            };
        },
        toEqualImmutable: function (expected) {
            return {
                compare: function (actual, expected) {
                    return {pass: Immutable.is(actual, expected)};
                }
            };
        }
    });
};
