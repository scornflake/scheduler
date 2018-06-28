import {Component, Input} from '@angular/core';
import {Person} from "../../scheduling/people";

import {Unavailability} from "../../scheduling/unavailability";
import {PopoverController} from "ionic-angular";
import {CalendarComponent} from "../swbcalendar/swbcalendar";

@Component({
    selector: 'person-unavailable',
    templateUrl: 'person-unavailable.html'
})
export class PersonUnavailableComponent {
    @Input() title = 'Unavailable';
    @Input() person: Person;
    @Input() readOnly: boolean = false;

    // private logger: Logger;

    constructor(private popover: PopoverController) {
        // this.logger = LoggingWrapper.getLogger(`component.unavailable`);
    }

    get unavailability() {
        // this.logger.info(`Person ${this.person} has ${this.person.unavailable.length} unavails`);
        return this.person.unavailable.sort((a: Unavailability, b: Unavailability) => {
            return a.fromDate - b.fromDate;
        });
    }

    toCalendarDate(date: Date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            date: date.getDate()
        }
    }

    deleteUnavailability(u) {
        this.person.removeUnavailable(u);
    }

    get existingEvents() {
        let existingEvents = [];
        this.unavailability.forEach(u => {
            if (u.isDateRange) {
                u.dateRange.forEach(d => {
                    existingEvents.push(this.toCalendarDate(d));
                })
            } else {
                existingEvents.push(this.toCalendarDate(u.fromDate))
            }
        });
        return existingEvents;
    }

    addUnavailability() {
        // poup the calendar!
        let pop = this.popover.create(CalendarComponent, {
            range: false,
            existingEvents: this.existingEvents,
            daySelectedCallback: (event) => {
                let newDate = new Date(event.year, event.month, event.date);
                this.person.addUnavailable(newDate);
                return true;
            }
        }, {cssClass: 'calendar'});
        pop.present();
    }

    addUnavailabilityRange() {
        // poup the calendar!
        let pop = this.popover.create(CalendarComponent, {
            range: true,
            existingEvents: this.existingEvents,
            rangeSelectedCallback: (from, to) => {
                let fromDate = new Date(from.year, from.month, from.date);
                let toDate = new Date(to.year, to.month, to.date);
                this.person.addUnavailableRange(fromDate, toDate);
                return true;
            }
        }, {cssClass: 'dual-calendar'});
        pop.present();
    }
}
