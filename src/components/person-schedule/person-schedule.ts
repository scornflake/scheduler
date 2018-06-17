import {Component, Input} from '@angular/core';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import includes from 'lodash/includes';

@Component({
    selector: 'person-schedule',
    templateUrl: 'person-schedule.html'
})
export class PersonScheduleComponent {

    @Input() schedule: ScheduleWithRules;
    @Input() person: Person;

    constructor(public store: RootStore) {
    }

    scheduled_dates(): Array<any> {
        return this.schedule.dates.filter(schedule => {
            if (!this.person) {
                return false;
            }
            return includes(schedule.people, this.person);
        });
    }
}
