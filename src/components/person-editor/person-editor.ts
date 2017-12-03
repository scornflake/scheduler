import {Component, Input} from '@angular/core';
import {Person} from "../../state/people";
import includes from 'lodash/includes';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";

@Component({
    // changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'person-editor',
    templateUrl: 'person-editor.html'
})
export class PersonEditorComponent {
    @Input() person: Person;

    @Input() schedule: ScheduleWithRules;

    constructor() {
    }

    scheduled_dates() {
        // Find a list of schedules for this person
        return Array.from(this.schedule.dates.values()).filter(v => {
            return includes(v.people, this.person);
        });
    }
}
