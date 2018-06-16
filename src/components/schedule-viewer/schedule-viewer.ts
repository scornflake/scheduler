import {ApplicationRef, Component, Input, ViewChild} from '@angular/core';
import {isArray} from "util";
import {Person} from "../../scheduling/people";
import {PopoverController, Slides} from "ionic-angular";
import {ReasonsComponent} from "../reasons/reasons";
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {computed} from "mobx-angular";
import {RootStore} from "../../store/root";
import {ScheduleAtDate} from "../../scheduling/shared";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";

@Component({
    // changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'schedule-viewer',
    templateUrl: 'schedule-viewer.html'
})
export class ScheduleViewerComponent {
    @Input() schedule: ScheduleWithRules;

    @ViewChild(Slides) slides: Slides;

    colSelectedDate: Date;
    private logger: Logger;

    constructor(private store: RootStore,
                private appRef: ApplicationRef,
                public popoverCtrl: PopoverController) {
        this.logger = LoggingWrapper.getLogger('component.schedule.view')
    }

    ngOnInit() {
        // if (this.store.ui_store.saved_state.last_selected_date == null) {
        //     if(this.colSelectableDates) {
        //         if (this.colSelectableDates.length > 0) {
        //             this.logger.info(`Selecting a new default date of: ${this.colSelectableDates[0]}`);
        //             this.store.ui_store.saved_state.last_selected_date = this.colSelectableDates[0];
        //         }
        //     }
        // }
        this.colSelectedDate = this.store.ui_store.saved_state.last_selected_date;
        if (!this.colSelectedDate) {
            if (this.schedule) {
                this.colSelectedDate = this.schedule.dates[0].date;
            }
        }
    }

    get colSelectableDates(): Date[] {
        return this.schedule.dates.map(sd => sd.date);
    }

    get colSelectedSchedule(): ScheduleAtDate {
        return this.schedule.scheduleForDate(this.colSelectedDate);
    }

    get rowMode(): boolean {
        return false;
    }

    @computed
    get headers(): Array<{ name: string, priority: number }> {
        if (!this.schedule) {
            return [];
        }
        return this.schedule.jsonFields();
    }

    @computed
    get rows(): Array<Object> {
        if (!this.schedule) {
            return [];
        }
        // console.log(SafeJSON.stringify(this.schedule.jsonResult()));
        return this.schedule.jsonResult();
    }

    presentPopover(myEvent) {
        let popover = this.popoverCtrl.create(ReasonsComponent, {});
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
        let role = this.schedule.plan.find_role(role_name);
        if (!role) {
            return false;
        }

        let date_for_row = row['date'];
        return this.schedule.is_person_in_exclusion_zone(person, role, date_for_row);
    }

    /*
    Want to mark if:
    a) The person within this cell == the selected person
     */
    selected_and_in_role(obj: Object, role_name) {
        if (obj instanceof Person) {
            if (obj == null) {
                console.error("a_person is null. This seems bad");
                return false;
            }
            let person = this.selected_person;
            if (!person) {
                return false;
            }
            if (obj.uuid != person.uuid) {
                return false;
            }
            return this.schedule.plan.find_role(role_name);
        }
    }

    select(obj: Object, date: Date, role_name: string) {
        if (obj instanceof Person) {
            let role = this.schedule.plan.find_role(role_name);
            console.log("Selecting: " + obj + " on " + date.toDateString() + " for " + role.name);

            this.store.ui_store.select(obj, date, role);
            this.appRef.tick();
        }
    }

    textFor(obj: Object): string {
        if (obj instanceof Person) {
            return obj.name;
        }
        return obj.toString();
    }

    @computed
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

    selectNextDate(offset: number) {
        // find the next date!
        let dates = this.schedule.dates.map(sd => sd.date);
        let currentIndex = dates.indexOf(this.colSelectedDate);
        if (currentIndex != -1) {
            let nextIndex = currentIndex + offset;
            if (nextIndex >= 0 && nextIndex < this.schedule.dates.length) {
                this.colSelectedDate = this.schedule.dates[nextIndex].date;
            }
            this.slides.slideTo(nextIndex);
        }
    }

    slideChanged() {
        // select the correct date for the given sd
        let currentIndex = this.slides.getActiveIndex();
        this.colSelectedDate = this.schedule.dates[currentIndex].date;
    }
}
