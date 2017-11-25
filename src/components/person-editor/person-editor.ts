import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Person} from "../../state/people";
import {ScheduleByExclusion} from "../../scheduling/scheduler";
import includes from 'lodash/includes';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'person-editor',
    templateUrl: 'person-editor.html'
})
export class PersonEditorComponent {
    @Input() person: Person;
    @Input() schedule: ScheduleByExclusion;

    constructor() {
    }

    scheduled_dates() {
        // Find a list of schedules for this person
        let schedules = Array.from(this.schedule.dates.values()).filter(v => {
            return includes(v.people, this.person);
        });

        return schedules;
        // return schedules.map(s => s.date);
    }
}
