import {Component, Input} from '@angular/core';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {ScheduleAtDate} from "../../scheduling/shared";

@Component({
    selector: 'person-schedule',
    templateUrl: 'person-schedule.html'
})
export class PersonScheduleComponent {

    @Input() schedule: ScheduleWithRules;
    @Input() person: Person;

    constructor(public store: RootStore) {
    }

    get scheduled_dates(): Array<ScheduleAtDate> {
        if (!this.person || !this.schedule) {
            return [];
        }
        return this.schedule.dates.filter(schedule => {
            return schedule.people.indexOf(this.person) != -1;
        });
    }
}
