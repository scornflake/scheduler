import {Component, Input} from '@angular/core';
import {ScheduleByExclusion} from "../../scheduling/by_exclusion/scheduler";
import {isArray} from "util";
import {Person} from "../../state/people";
import {RootStore} from "../../state/root";
import {PopoverController} from "ionic-angular";
import {ReasonsComponent} from "../reasons/reasons";
import {Role} from "../../state/roles";

@Component({
    // changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'schedule-viewer',
    templateUrl: 'schedule-viewer.html'
})
export class ScheduleViewerComponent {
    @Input() schedule: ScheduleByExclusion;

    constructor(private store: RootStore,
                public popoverCtrl: PopoverController) {
    }

    get headers(): Array<string> {
        if (!this.schedule) {
            return [];
        }
        return this.schedule.jsonFields();
    }

    get rows(): Array<Object> {
        if (!this.schedule) {
            return [];
        }
        // console.log(JSON.stringify(this.schedule.jsonResult()));
        return this.schedule.jsonResult();
    }

    presentPopover(myEvent) {
        let popover = this.popoverCtrl.create(ReasonsComponent, {
            // reasons:this.store.ui_store.s
        });
        popover.present({
            ev: myEvent
        });
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
        let role = this.store.roles_store.find_role(role_name);
        if (!role) {
            return false;
        }

        let date_for_row = row['date'];
        let exclusion_zones = this.schedule.exclusion_zones.get(person);
        if (!exclusion_zones) {
            return false;
        }

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
    selected_and_in_role(a_person: Person, role_name) {
        if (a_person == null) {
            console.error("a_person is null. This seems bad");
            return false;
        }
        let person = this.selected_person;
        if (!person) {
            return false;
        }
        if (a_person.uuid != person.uuid) {
            return false;
        }
        return this.store.roles_store.find_role(role_name);

    }

    select(person: Person, date: Date, role_name: string) {
        let role = this.store.roles_store.find_role(role_name);
        console.log("Selecting: " + person + " on " + date.toDateString() + " for " + role.name);
        this.store.ui_store.selected_person = person;
        this.store.ui_store.selected_date = date;
        this.store.ui_store.selected_role = role;
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
