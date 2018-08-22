import {Component, OnDestroy, OnInit} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams, PopoverController} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {Person} from "../../scheduling/people";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";
import {action, computed, observable} from "mobx-angular";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";
import {RootStore} from "../../store/root";
import {Logger, LoggingService} from "ionic-logging-service";

import * as moment from "moment";
import {formatAsPlanDate, formatForAsYMDIonicDateString} from "../../scheduling/common/date-utils";
import {ConnectivityService} from "../../common/network/connectivity";
import {CalendarComponent} from "../../components/swbcalendar/swbcalendar";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";

@IonicPage({
    name: 'page-plan-details',
    defaultHistory: ['page-plans', 'home']
})
@Component({
    selector: 'page-plan-details',
    templateUrl: 'plan-details.html',
})
export class PlanDetailsPage implements OnInit, OnDestroy {
    useCalendar: boolean = false;
    plan: Plan;
    @observable name_filter: string;
    private logger: Logger;
    private ngUnsubscribe: Subject<any>;

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public access: AccessControlProvider,
                private popover: PopoverController,
                private device: ConnectivityService,
                public logService: LoggingService,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.logger = this.logService.getLogger('page.plan-details');
        this.ngUnsubscribe = new Subject();
    }

    ngOnInit() {
        this.plan = this.navParams.get('plan');

        if (this.plan == null) {
        } else {
            // for debugging
            // this.showAssignment(this.plan.people[0]);
        }

        this.device.onBrowser$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(flag => this.useCalendar = flag)
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    get minDate(): string {
        return formatForAsYMDIonicDateString(moment().subtract(6, 'months'))
    }

    get maxDate(): string {
        return formatForAsYMDIonicDateString(moment().add(6, 'months'))
    }

    get canManage() {
        return this.access.canUpdateAny(ResourceType.Plan);
    }

    selectStartDate() {
        let pop = this.popover.create(CalendarComponent, {
            range: false,
            startAt: this.plan.start_date,
            daySelectedCallback: (event) => {
                this.plan.setStartDate(new Date(event.year, event.month, event.date));
                return true;
            }
        }, {cssClass: 'calendar'});
        pop.present();
    }

    selectEndDate() {
        let pop = this.popover.create(CalendarComponent, {
            range: false,
            startAt: this.plan.end_date,
            daySelectedCallback: (event) => {
                this.plan.setEndDate(new Date(event.year, event.month, event.date));
                return true;
            }
        }, {cssClass: 'calendar'});
        pop.present();
    }

    @computed get sorted_people(): Array<Person> {
        return NamedObject.sortByName(this.plan.people).filter(p => {
            if (this.name_filter) {
                return p.name.toLowerCase().indexOf(this.name_filter.toLowerCase()) >= 0;
            }
            return true;
        })
    }

    get startDate(): string {
        return this.plan.start_date.toISOString();
    }

    get startDateFormatted(): string {
        return formatAsPlanDate(this.plan.start_date);
    }

    set startDate(value: string) {
        this.plan.setStartDateFromISO(value);
    }

    get endDate(): string {
        return this.plan.end_date.toISOString();
    }

    get endDateFormatted(): string {
        return formatAsPlanDate(this.plan.end_date);
    }

    set endDate(value: string) {
        this.plan.setEndDateFromISO(value);
    }

    description_for_person(p: Person) {
        let items: Array<any> = [p.availability];
        items = items.concat(this.plan.get_assignment_for(p).roles);
        return items.join(", ");
    }

    @action add_assignment() {
        // Choose a person
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select people to add"
        });
        let team = this.plan.team;
        let people_not_in_plan = team.people.filter(p => this.plan.get_assignment_for(p) == null);
        if (people_not_in_plan.length == 0) {
            this.pageUtils.showMessage("All people are already in the list");
            return;
        }
        for (let p of NamedObject.sortByName(people_not_in_plan)) {
            alert.addInput({
                type: 'checkbox',
                value: p.uuid,
                label: p.name
            })
        }
        alert.addButton({
            text: 'Cancel',
            role: 'cancel',
            handler: () => {

            }
        });
        alert.addButton({
            text: 'Add',
            handler: (uuids) => {
                for (let uuid of uuids) {
                    let person = team.findPersonByUUID(uuid);
                    this.plan.assignmentFor(person);
                }

                // If just single person added, can edit this directly
                if (uuids.length == 1) {
                    // Kick off UI with this
                    let person = team.findPersonByUUID(uuids[0]);
                    this.showAssignment(person);
                }
            }
        });
        alert.present();
    }

    @action delete_assignment_for_person(person) {
        this.plan.remove_person(person);
    }

    showAssignment(person) {
        let assignment = this.plan.get_or_create_assignment_for(person);
        if (assignment) {
            this.logger.info(`Showing assignment for ${assignment.person.name} and plan ${this.plan.name}`);
            this.navCtrl.push('page-person-assignment', {
                plan: this.plan,
                person: person
            })
        }
    }
}
