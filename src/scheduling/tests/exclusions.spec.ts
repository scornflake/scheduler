import {Exclusion} from "../shared";
import {Role} from "../service";

describe('exclusions', () => {
    let role = new Role("one");

    it('can detect overlap', () => {
        let ex1 = new Exclusion(new Date(2010, 0, 0), new Date(2010, 0, 5), role);
        let ex2 = new Exclusion(new Date(2010, 0, 10), new Date(2010, 0, 15), role);
        expect(ex1.overlap_with(ex2)).toBeFalsy();

        // Consecutive dates don't overlap
        let ex3 = new Exclusion(new Date(2010, 0, 6), new Date(2010, 0, 7), role);
        expect(ex1.overlap_with(ex3)).toBeFalsy();

        // Overlapping dates
        let ex4 = new Exclusion(new Date(2010, 0, 4), new Date(2010, 0, 7), role);
        expect(ex1.overlap_with(ex4)).toBeTruthy();
        expect(ex4.overlap_with(ex1)).toBeTruthy();
    });

    it('detects overlap with self', () => {
        let ex1 = new Exclusion(new Date(2010, 0, 0), new Date(2010, 0, 5), role);
        expect(ex1.overlap_with(ex1)).toBeTruthy();
    });


});