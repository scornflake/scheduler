import {Component, Input} from '@angular/core';
import {Person} from "../../scheduling/people";

import {Unavailability} from "../../scheduling/unavailability";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {PopoverController} from "ionic-angular";
import {CalendarComponent} from "../calendar/calendar";
import {csd} from "../../scheduling/common/date-utils";

@Component({
    selector: 'person-unavailble',
    templateUrl: 'person-unavailble.html'
})
export class PersonUnavailbleComponent {
    @Input() title = 'Unavailabilty';
    @Input() person: Person;
    private logger: Logger;

    constructor(private popover: PopoverController) {
        this.logger = LoggingWrapper.getLogger(`component.unavailable`);
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
                let newDate = csd(event.year, event.month, event.date);
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
                let fromDate = csd(from.year, from.month, from.date);
                let toDate = csd(to.year, to.month, to.date);
                this.person.addUnavailableRange(fromDate, toDate);
                return true;
            }
        }, {cssClass: 'dual-calendar'});
        pop.present();
    }
}
