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

    @Input('person')
    set person(newPerson: Person) {
        this._person = newPerson;
    }

    get person() {
        return this._person;
    }

    @Input() stacked: boolean = false;

    private _person: Person;

    constructor(public store: RootStore) {
    }

    get scheduled_dates(): Array<ScheduleAtDate> {
        if (this._person === undefined || this.schedule === undefined || this._person == null || this.schedule == null) {
            console.warn(`no schedule for ${this._person} so return []`);
            return [];
        }
        return this.schedule.dates.filter(sd => {
            let allPeople = sd.people;
            // let dump = allPeople.map(p => `${p.name}=${p.uuid}`);
            // console.log(`people for: ${sd.date} = ${SWBSafeJSON.stringify(dump)}`);
            return allPeople.indexOf(this._person) != -1;
        });
    }
}
