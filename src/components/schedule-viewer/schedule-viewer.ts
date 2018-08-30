import {AfterViewInit, ApplicationRef, Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {isArray} from "util";
import {Person} from "../../scheduling/people";
import {PopoverController, Slides} from "ionic-angular";
import {ReasonsComponent} from "../reasons/reasons";
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {computed, observable} from "mobx-angular";
import {RootStore} from "../../store/root";
import {ScheduleAtDate} from "../../scheduling/shared";
import {Logger, LoggingService} from "ionic-logging-service";
import {Role} from "../../scheduling/role";
import {runInAction} from "mobx";
import * as moment from "moment";
import {AccessControlProvider} from "../../providers/access-control/access-control";

enum ViewMode {
    phone = 'phone',
    browser = 'browser'
}

@Component({
    // changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'schedule-viewer',
    templateUrl: 'schedule-viewer.html'
})
export class ScheduleViewerComponent implements OnInit, AfterViewInit, OnDestroy {
    private selectedButton: number = 0;
    private lastSlideCommand: any;

    @Input('schedule')
    set schedule(s: ScheduleWithRules) {
        runInAction(() => {
            this._schedule = s;
            this.afterScheduleSet();
        });
    };

    get schedule(): ScheduleWithRules {
        return this._schedule;
    }

    @Input() me: Person;
    @Input() viewMode: ViewMode = ViewMode.phone;
    @Input() selectClosestDay: boolean = false;

    @Input('search')
    set search(searchString: string) {
        this._searchString = searchString;
        this.selectFirstMatchingAssignmentFor(this._searchString);
    }

    @ViewChild(Slides) slides: Slides;

    colSelectedDate: Date;
    private logger: Logger;
    private _searchString: string;

    @observable private _schedule: ScheduleWithRules;

    constructor(private store: RootStore,
                private appRef: ApplicationRef,
                private access: AccessControlProvider,
                private logService: LoggingService,
                public popoverCtrl: PopoverController) {
        this.logger = this.logService.getLogger('component.schedule.view')
    }

    ngOnInit() {
        this.afterScheduleSet();
    }

    ngAfterViewInit() {
    }

    // slideTo2(index: number, thenDo): Observable<any> {
    //     const startedWaiting = moment();
    //     const maximumWaitTimeInSeconds = 3;
    //
    //     const isReady = val => this.slides._snapGrid !== undefined;
    //
    //     const doTheThing = interval(50).pipe(
    //         timeout(maximumWaitTimeInSeconds * 1000),
    //
    //     );
    //
    //     return doTheThing.pipe(
    //         takeUntil(filter(isReady))
    //     )
    // }

    slideTo(index: number, thenDo) {
        // Only do this if in not in rowMode
        if (this.viewMode) {
            this.logger.info(`Ignored request to slide to ${index}, we're in rowMode`);
            thenDo();
            return;
        }
        this.clearSliderTimeout();
        if (this.slides === undefined || this.slides._snapGrid === undefined) {
            console.warn(`Try again to ${index}... no slides yet`);
            this.lastSlideCommand = setTimeout(() => {
                this.slideTo(index, thenDo);
            }, 50)
        } else {
            this.slides.slideTo(index);
            thenDo();
        }
    }

    private clearSliderTimeout() {
        if (this.lastSlideCommand) {
            window.clearTimeout(this.lastSlideCommand);
            this.lastSlideCommand = null;
        }
    }

    private afterScheduleSet() {
        this.slideTo(0, () => {
            this.colSelectedDate = this.store.loggedInPerson.preferences.last_selected_date;
            if (!this.colSelectedDate) {
                if (this.schedule) {
                    this.colSelectedDate = this.schedule.dates[0].date;
                }
            }
            this.selectClosestDayInSchedule();
        });
    }

    ngOnDestroy() {
        this.clearSliderTimeout();
    }

    showInfoClicked() {
        this.selectedButton = 0;
    }

    showReasonsClicked() {
        this.selectedButton = 1;
    }

    get showReasons(): boolean {
        return this.selectedButton == 1;
    }

    get showInfo(): boolean {
        return this.selectedButton == 0;
    }

    get isSuperuser(): boolean {
        return this.access.isSuperuser();
    }

    get inBrowserMode(): boolean {
        return this.viewMode === ViewMode.browser;
    }

    @computed get observableSchedule(): ScheduleWithRules {
        return this._schedule;
    }

    @computed get roles(): Array<Role> {
        return this.schedule.plan.roles;
    }

    @computed get colSelectableDates(): Date[] {
        return this.schedule.dates.map(sd => sd.date);
    }

    @computed get colSelectedSchedule(): ScheduleAtDate {
        return this.schedule.scheduleForDate(this.colSelectedDate);
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

    describe_exclusion_position(row, role_name: string): string[] {
        let person = this.selected_person;
        if (!person) {
            return [];
        }
        let role = this.schedule.plan.find_role(role_name);
        if (!role) {
            return [];
        }
        let names = [];
        let date_for_row = row['date'];
        let zones = this.schedule.facts.get_exclusion_zones(this.selected_person, role, date_for_row);
        for (let zone of zones) {
            let hoursDiffFromStart = moment(zone.start_date).diff(date_for_row, 'days');
            if (hoursDiffFromStart >= 0 && hoursDiffFromStart <= 1) {
                names.push('start')
            }
            let hoursDiff = moment(date_for_row).diff(zone.end_date, 'days');
            this.logger.info(`${zone.end_date} is ${hoursDiff} from ${date_for_row}`);
            if (hoursDiff >= 0 && hoursDiffFromStart <= 7) {
                names.push('end')
            }
        }
        return names;
    }

    clicked(obj: Object, date: Date) {
        if (obj instanceof Person) {
            let person = this.selected_person;
            if (!person) {
                return false;
            }
            if (obj.uuid == person.uuid && this.store.ui_store.selected_date == date) {
                return true;
            }
        }
        return false;
    }

    /*
    Want to mark if:
    a) The person within this cell == the selected person
     */
    selected_and_in_role(obj: Object, role_name) {
        if (obj instanceof Person) {
            if (obj == null) {
                this.logger.error("a_person is null. This seems bad");
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

    deselect() {
        this.store.ui_store.clear_selection();
        // this.appRef.tick();
    }

    select(obj: Object, date: Date, role_name: string, tick: boolean = true) {
        if (obj instanceof Person) {
            let role = this.schedule.plan.find_role(role_name);
            this.logger.info("Selecting: " + obj + " on " + date.toDateString() + " for " + role.name);

            this.store.ui_store.select(obj, date, role);
            if (tick) {
                this.appRef.tick();
            }
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

    private selectClosestDayInSchedule() {
        if (!this.selectClosestDay) {
            return;
        }
        if (!this.schedule) {
            return;
        }

        const todaysDate = moment();
        let index = 0;
        if (this.schedule === undefined) {
            this.logger.warn(`Didn't select closet date, no schedule!`);
            return;
        }
        if (this.schedule.dates === undefined) {
            this.logger.warn(`Didn't select closet date, no schedule dates!`);
            return;
        }
        for (let date of this.schedule.dates.map(sd => sd.date)) {
            if (moment(date).isAfter(todaysDate)) {
                // use the previous index!
                this.logger.info(`Selecting slide ${index} as it's directly before ${date}`);
                this.slideTo(index, () => {
                    this.colSelectedDate = date;
                });
                return;
            }
            index++;
        }
    }

    private selectFirstMatchingAssignmentFor(search: string) {
        if (search === undefined) {
            return;
        }
        if (search == '') {
            this.deselect();
            return;
        }

        if (!this.store.schedule) {
            this.deselect();
            return;
        }

        let plan = this.store.schedule.plan;

        for (let person of plan.team.people) {
            if (person.name.toLowerCase().indexOf(search.toLowerCase()) != -1) {
                // Select first match of this person
                for (let sd of this.schedule.dates) {
                    let assign = sd.assignment_for_person(person);
                    if (!assign) {
                        continue;
                    }
                    if (assign.roles) {
                        if (assign.roles.length > 0) {
                            this.select(person, sd.date, assign.roles[0].name, false);
                            return;
                        }
                    }
                }
            }
        }
    }
}
