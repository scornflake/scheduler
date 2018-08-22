import {Component, Input, Output, EventEmitter} from '@angular/core';
import * as moment from 'moment';
import * as _ from "lodash";
import {Moment} from "moment";

export interface singularDate {
    year: number,
    month: number,
    date: number
}

// Each grid item of a calendar
export interface dateObj {
    year: number,
    month: number,
    date: number, // What's the date?
    isThisMonth: boolean, // Is this the currently selected month?
    isToday?: boolean,
    isSelect?: boolean,
    hasEvent?: boolean,
}

@Component({
    selector: 'ion-calendar',
    templateUrl: 'ion-calendar.html',
})
export class Calendar {

    @Output() onDaySelect = new EventEmitter<dateObj>();
    @Output() onMonthSelect = new EventEmitter<any>();
    @Input() events: Array<singularDate> = [];
    @Input() lang: string;

    currentYear: number = moment().year();
    currentMonth: number = moment().month();
    currentDate: number = moment().date();
    currentDay: number = moment().day();

    displayYear: number = moment().year();
    displayMonth: number = moment().month();

    dateArray: Array<dateObj> = []; // Array for all the days of the month
    weekArray: Array<Array<dateObj>> = []; // Array for each row of the calendar
    lastSelect: number = 0; // Record the last clicked location

    weekHead: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    constructor() {
        this.today();
        this.createMonth(this.displayYear, this.displayMonth);
    }

    ngOnChanges() {
        this.createMonth(this.displayYear, this.displayMonth);
    }

    ngAfterContentInit() {
        if (!this.lang) {
            this.lang = 'en';
        }
        if (this.lang === 'es') {
            this.weekHead = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        }
    }

    // Jump to some date, maybe without emitting a change
    jumpToDate(thatDate: Moment, emitChange: boolean = false) {
        this.displayYear = thatDate.year();
        this.displayMonth = thatDate.month();
        this.createMonth(thatDate.year(), thatDate.month());

        // Mark today as a selection
        let todayIndex = _.findIndex(this.dateArray, {
            year: thatDate.year(),
            month: thatDate.month(),
            date: thatDate.date(),
            isThisMonth: true
        });
        this.lastSelect = todayIndex;

        if(emitChange) {
            this.dateArray[todayIndex].isSelect = true;
        }
    }

    // Jump to today
    today() {
        this.jumpToDate(moment(), true);
    }

    isInEvents(year: number, month: number, date: number) {
        var i = 0, len = this.events.length;
        for (; i < len; i++) {
            if (this.events[i].year == year && this.events[i].month == month && this.events[i].date == date) {
                return true;
            }
        }
        return false;
    }

    createMonth(year: number, month: number) {
        this.dateArray = []; // Clear last month's data
        this.weekArray = []; // Clear week data

        let firstDay;
        // The day of the week on the first day of the current month of
        // selection determines how many days to take out last month. Sunday
        // does not show last month, Monday shows the previous month, Tuesday
        // shows the last two days

        let preMonthDays; // The number of days for the previous month
        let monthDays; // The number of days for the month
        let weekDays: Array<dateObj> = [];

        firstDay = moment({year: year, month: month, date: 1}).day();
        // The number of days last month
        if (month === 0) {
            preMonthDays = moment({year: year - 1, month: 11}).daysInMonth();
        } else {
            preMonthDays = moment({year: year, month: month - 1}).daysInMonth();
        }
        // The number of days this month
        monthDays = moment({year: year, month: month}).daysInMonth();

        // PREVIOUS MONTH
        // Add the last few days of the previous month to the array
        if (firstDay !== 7) { // Sunday doesn't need to be shown for the previous month
            let lastMonthStart = preMonthDays - firstDay + 1; // From the last few months start
            for (let i = 0; i < firstDay; i++) {
                if (month === 0) {
                    this.dateArray.push({
                        year: year,
                        month: 11,
                        date: lastMonthStart + i,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                        hasEvent: (this.isInEvents(year, 11, lastMonthStart + i)) ? true : false,
                    })
                } else {
                    this.dateArray.push({
                        year: year,
                        month: month - 1,
                        date: lastMonthStart + i,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                        hasEvent: (this.isInEvents(year, month - 1, lastMonthStart + i)) ? true : false,
                    })
                }

            }
        }

        // Add the numeral for this month to the array
        for (let i = 0; i < monthDays; i++) {
            this.dateArray.push({
                year: year,
                month: month,
                date: i + 1,
                isThisMonth: true,
                isToday: false,
                isSelect: false,
                hasEvent: (this.isInEvents(year, month, i + 1)) ? true : false,
            })
        }

        if (this.currentYear === year && this.currentMonth === month) {
            let todayIndex = _.findIndex(this.dateArray, {
                year: this.currentYear,
                month: this.currentMonth,
                date: this.currentDate,
                isThisMonth: true
            })
            this.dateArray[todayIndex].isToday = true;
        }

        // Add the number of days next month to the array, with some months showing 6 weeks and some months showing 5 weeks
        if (this.dateArray.length % 7 !== 0) {
            let nextMonthAdd = 7 - this.dateArray.length % 7
            for (let i = 0; i < nextMonthAdd; i++) {
                if (month === 11) {
                    this.dateArray.push({
                        year: year,
                        month: 0,
                        date: i + 1,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                        hasEvent: (this.isInEvents(year, 0, i + 1)) ? true : false,
                    })
                } else {
                    this.dateArray.push({
                        year: year,
                        month: month + 1,
                        date: i + 1,
                        isThisMonth: false,
                        isToday: false,
                        isSelect: false,
                        hasEvent: (this.isInEvents(year, month + 1, i + 1)) ? true : false,
                    })
                }

            }
        }

        // All date data is now added to the dateArray array

        // Insert the date data into the new array every seven days
        for (let i = 0; i < this.dateArray.length / 7; i++) {
            for (let j = 0; j < 7; j++) {
                weekDays.push(this.dateArray[i * 7 + j]);
            }
            this.weekArray.push(weekDays);
            weekDays = [];
        }
    }

    back() {
        // Decrementing the year if necessary
        if (this.displayMonth === 0) {
            this.displayYear--;
            this.displayMonth = 11;
        } else {
            this.displayMonth--;
        }
        this.onMonthSelect.emit({
            'year': this.displayYear,
            'month': this.displayMonth
        });
        this.createMonth(this.displayYear, this.displayMonth);
    }

    forward() {
        // Incrementing the year if necessary
        if (this.displayMonth === 11) {
            this.displayYear++;
            this.displayMonth = 0;
        } else {
            this.displayMonth++;
        }
        this.onMonthSelect.emit({
            'year': this.displayYear,
            'month': this.displayMonth
        });
        this.createMonth(this.displayYear, this.displayMonth);
    }

    // Select a day, click event
    daySelect(day: dateObj, i: number, j: number) {
        // First clear the last click status
        this.dateArray[this.lastSelect].isSelect = false;
        // Store this clicked status
        this.lastSelect = i * 7 + j;
        this.dateArray[i * 7 + j].isSelect = true;

        this.onDaySelect.emit(day);
    }
}

