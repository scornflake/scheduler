import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";

@Component({
    selector: 'person-details',
    templateUrl: 'person-details.html'
})
export class PersonDetailsComponent {
    @Input() person: Person;

    @Output() show_availability = new EventEmitter();

    constructor() {
    }

}
