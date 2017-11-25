import {Component} from '@angular/core';
import {ScheduleCreatorProvider} from "../../providers/schedule-creator/schedule-creator";
import {ScheduleByExclusion} from "../../scheduling/scheduler";
import {isArray} from "util";
import {StoreProvider} from "../../providers/store/store";
import {Person} from "../../state/people";
import includes from 'lodash/includes';

@Component({
    selector: 'schedule-viewer',
    templateUrl: 'schedule-viewer.html'
})
export class ScheduleViewerComponent {
    constructor(private creator: ScheduleCreatorProvider,
                private store: StoreProvider) {
    }

    ngOnInit() {
        this.creator.get_new_schedule();
    }

    get headers(): Array<string> {
        return this.schedule.jsonFields();
    }

    get rows(): Array<Object> {
        return this.schedule.jsonResult();
    }

    keys_for_row(row) {
        let keys = Object.keys(row).filter(v => !v.startsWith('date'));
        return Array.from(keys);
    }

    value_as_array(value): any[] {
        if (isArray(value)) {
            return value;
        }
        return [value];
    }

    get schedule(): ScheduleByExclusion {
        return this.creator.schedule;
    }

    /*
    Want to paint a rectangle, from the person@slot, to the end of their exclusion zone
    Every time we place someone, we do create an exclusion that says "jeremy, excluded 2 wks, due to guitar'

    We can use this.
    This method is called every cell. We're asking if this cell:
    a) sits in an exclusion zone, for the selected person
    b) where that exclusion zone includes the date of the row
     */
    in_exclusion_zone(row, role_name): boolean {
        let person = this.selected_person;
        if (!person) {
            return false;
        }
        let role = this.store.role_store.find_role(role_name);
        if (!role) {
            return false;
        }

        let date_for_row = row['date'];
        let exclusion_zones = this.schedule.exclusion_zones.get(person);

        // lets find those zones relating directly to this role
        let zones_matching_role = exclusion_zones.filter(z => z.role.uuid == role.uuid);
        if (!zones_matching_role.length) {
            return false;
        }

        let containining_this_date = zones_matching_role.filter(z => z.includes_date(date_for_row));
        return containining_this_date.length > 0;
    }

    /*
    Want to mark if:
    a) The person within this cell == the selected person
     */
    selected_and_in_role(row, role_name) {
        let person = this.selected_person;
        if (!person) {
            return false;
        }
        let role = this.store.role_store.find_role(role_name);
        if (!role) {
            return false;
        }
        return includes(this.value_as_array(row[role_name].map(p => p.name)), person.name);
    }

    select(person) {
        this.store.ui_store.selected_person = person;
    }

    get selected_person(): Person {
        if (!this.store.ui_store || this.store.ui_store.selected_person == null) {
            return null;
        }
        return this.store.ui_store.selected_person;
    }

    get hover(): string {
        if (!this.selected_person) {
            return "Nothing";
        }
        return this.selected_person.name;
    }
}
