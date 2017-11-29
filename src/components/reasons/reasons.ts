import {Component, Input} from '@angular/core';

@Component({
    selector: 'reasons',
    templateUrl: 'reasons.html'
})
export class ReasonsComponent {
    @Input() decisions: Array<string>;

    constructor() {
    }
}
