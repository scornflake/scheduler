import {AfterViewInit, Component, Input, OnInit, QueryList, ViewChildren} from '@angular/core';
import {DaySelectedCallback, RangeSelectedCallback} from "./calendar-interface";
import {NavParams, ViewController} from "ionic-angular";
import * as moment from "moment";
import {Calendar} from "../ion-calendar/ion-calendar";

@Component({
    selector: 'swbcalendar',
    templateUrl: 'swbcalendar.html'
})
export class CalendarComponent implements OnInit, AfterViewInit {
    @Input() range: boolean = false;
    @Input() daySelectedCallback: DaySelectedCallback;
    @Input() rangeSelectedCallback: RangeSelectedCallback;
    @Input() startAt: Date = null;

    @ViewChildren(Calendar) calendars: QueryList<Calendar>;

    private startDate: any;
    private endDate: any;
    private existingEvents: any[];

    constructor(private viewCtrlr: ViewController,
                private navParams: NavParams) {

        this.existingEvents = this.navParams.get('existingEvents');
        this.daySelectedCallback = this.navParams.get('daySelectedCallback');
        this.rangeSelectedCallback = this.navParams.get('rangeSelectedCallback');
        this.range = this.navParams.get('range');
        this.startAt = this.navParams.get('startAt') || null;

        if (!this.existingEvents) {
            this.existingEvents = [];
        }
    }

    get singleCalendar(): Calendar {
        if (this.calendars && this.calendars.length > 0) {
            return this.calendars.toArray()[0];
        }
        return null;
    }

    ngOnInit() {
    }

    ngAfterViewInit() {
        if (this.startAt) {
            let momentDate = moment(this.startAt);
            let cal = this.singleCalendar;
            if (momentDate && cal) {
                cal.jumpToDate(momentDate);
            }
        }
    }

    static toCalendarDate(date: Date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            date: date.getDate()
        }
    }

    daySelected($event) {
        if (this.daySelectedCallback) {
            if (this.daySelectedCallback($event)) {
                this.viewCtrlr.dismiss();
            }
        }
    }

    get valid(): boolean {
        return this.startDate && this.endDate;
    }

    done($event) {
        if (this.rangeSelectedCallback) {
            if (this.rangeSelectedCallback(this.startDate, this.endDate)) {
                this.viewCtrlr.dismiss();
            }
        }
    }

    startDaySelected($event) {
        this.startDate = $event;
    }

    endDaySelected($event) {
        this.endDate = $event;
    }
}
