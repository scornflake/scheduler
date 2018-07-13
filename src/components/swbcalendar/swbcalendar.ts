import {Component, Input} from '@angular/core';
import {DaySelectedCallback, RangeSelectedCallback} from "./calendar-interface";
import {NavParams, ViewController} from "ionic-angular";

@Component({
    selector: 'swbcalendar',
    templateUrl: 'swbcalendar.html'
})
export class CalendarComponent {
    @Input() range: boolean = false;
    @Input() daySelectedCallback: DaySelectedCallback;
    @Input() rangeSelectedCallback: RangeSelectedCallback;

    private startDate: any;
    private endDate: any;
    private existingEvents: any[];

    constructor(private viewCtrlr: ViewController,
                private navParams: NavParams) {

        this.existingEvents = this.navParams.get('existingEvents');
        this.daySelectedCallback = this.navParams.get('daySelectedCallback');
        this.rangeSelectedCallback = this.navParams.get('rangeSelectedCallback');
        this.range = this.navParams.get('range');

        if (!this.existingEvents) {
            this.existingEvents = [];
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
