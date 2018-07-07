import {Component, Input} from '@angular/core';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {ScheduleAtDate} from "../../scheduling/shared";
import {computed} from "mobx-angular";

@Component({
    selector: 'person-schedule',
    templateUrl: 'person-schedule.html'
})
export class PersonScheduleComponent {
    @Input() schedule: ScheduleWithRules;
    @Input() person: Person;

    constructor(public store: RootStore) {
    }

    // ngDoCheck() {
    //     console.warn(`PersonScheduleComponent is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`PersonScheduleComponent has changes`)
    // }

    @computed get scheduled_dates(): Array<ScheduleAtDate> {
        if (!this.person || !this.schedule) {
            console.warn(`no schedule for ${this.person} so return []`);
            return [];
        }
        return this.schedule.dates.filter(sd => {
            let allPeople = sd.people;
            let dump = allPeople.map(p => `${p.email}=${p.uuid}`);
            // console.log(`people for: ${sd.date} = ${SafeJSON.stringify(dump)}`);
            return allPeople.indexOf(this.person) != -1;
        });
    }
}
