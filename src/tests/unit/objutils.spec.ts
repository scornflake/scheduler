import {ObjectUtils} from "../../pages/page-utils";

describe('obj utils', () => {
    beforeEach(() => {
    });

    it('can detect changes in a simple object', function () {
        class Simple {
            name: string;
            num: number;
        }

        let first = new Simple();
        first.name = "superman";
        first.num = 42;

        let second = new Simple();
        second.name = "superman2";
        second.num = 5;

        // it's different to begin with (both fields)
        expect(ObjectUtils.deep_equal(first, second)).toBeFalsy();

        // Still diff!
        second.num = 42;
        expect(ObjectUtils.deep_equal(first, second)).toBeFalsy();

        // Now the same
        second.name = first.name;
        expect(ObjectUtils.deep_equal(first, second)).toBeTruthy();
    });

    it('can detect changes in nested structure', () => {
        let last_index = 0;

        class Other {
            index: number = last_index++;
        }

        class Simple {
            name: string = "ra";
            num: number = 44;
            dependents = new Array<Other>();
        }

        // Exactly the same. Equal.
        let first = new Simple();
        let second = new Simple();
        expect(ObjectUtils.deep_equal(first, second)).toBeTruthy();

        // A change to the contents of the array
        second.dependents.push(new Other());
        expect(ObjectUtils.deep_equal(first, second)).toBeFalsy();

        // Change to the object inside the array
        first.dependents.push(new Other());
        expect(ObjectUtils.deep_equal(first, second)).toBeFalsy();

        // Make both objects, although different references, have the same value
        second.dependents[0].index = first.dependents[0].index;
        expect(ObjectUtils.deep_equal(first, second)).toBeTruthy();
    });


});