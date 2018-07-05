import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams, PopoverController} from 'ionic-angular';
import {WizardPage} from "../team-wizard/wizard";
import {RootStore} from "../../store/root";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RoleSetResponse} from "../../common/interfaces";
import {PageUtils} from "../page-utils";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Plan} from "../../scheduling/plan";
import {Role} from "../../scheduling/role";
import * as moment from "moment";
import {CalendarComponent} from "../../components/swbcalendar/swbcalendar";
import {action, observable} from "mobx-angular";
import {runInAction} from "mobx";
import {clamp} from "ionic-angular/util/util";

@IonicPage({
    name: 'page-plan-wizard',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-plan-wizard',
    templateUrl: 'plan-wizard.html',
})
export class PlanWizardPage extends WizardPage {

    @observable public planName: string;
    @observable public startDate: Date;
    @observable public endDate: Date;

    public teamUUID: string;

    @observable public roleSetName: string;
    @observable private roleSets: RoleSetResponse[] = [];
    @observable private chosenRoleSet: RoleSetResponse;

    private logger: Logger;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public server: SchedulerServer,
                private popover: PopoverController,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        super();

        this.logger = LoggingWrapper.getLogger(`page.planwiz`);

        // default of today, for 3 months
        this.startDate = moment().toDate();
        this.endDate = moment().add(3, 'month').toDate();

        // for debug
        this.planName = 'Super Cunning';
        this.roleSetName = "Music";
    }

    ionViewDidLoad(): void {
        super.ionViewDidLoad();
        if (this.store.loggedInPerson == null) {
            setTimeout(() => {
                this.navCtrl.pop();
            }, 1500);
        }
        if (this.store.teams.length > 0) {
            this.teamUUID = this.store.teams.all[0].uuid;
        }
    }

    slideChanged() {
        // if we're now on the select a team
        if (this.slides.getActiveIndex() == 1) {
            if (this.store.teams.length == 1) {
                // don't need to stay here!
                // go to the next
                console.warn(`Just one plan, skipping to next`);
                // this.debugGoNextSlide(50);
            }
        }

        if (this.slides.getActiveIndex() == 2) {
            // Role sets.
            this.setIsSaving();
            this.logger.info(`Getting role sets...`);
            this.server.getRoleSets().then((rs: RoleSetResponse[]) => {
                runInAction(() => {
                    this.roleSets = rs;
                    if (rs.length > 0) {
                        this.roleSetName = rs[0].name;
                    }
                });
                this.setIsNotSaving();
                this.logger.info(`Got role sets.`);
                // this.debugGoNextSlide();
            }, err => {
                this.pageUtils.showError(err);
                this.setIsNotSaving();
            });
        }
    }

    @action setRoleSetName(value: string) {
        this.roleSetName = value;
    }

    nextSlide(slideNumber: any = null): void {
        // role sets
        if (this.slides.getActiveIndex() == 2) {
            this.chosenRoleSet = this.roleSets.find(rs => rs.name == this.roleSetName);
        }
        super.nextSlide(slideNumber);
    }

    private debugGoNextSlide(timer = 250, actualNumber = null) {
        setTimeout(() => {
            this.nextSlide(actualNumber);
        }, timer);
    }

    get nextIsEnabled(): boolean {
        let activeIndex = this.slides.getActiveIndex();

        // Name, dates
        if (activeIndex == 0) {
            if (!this.planName) {
                return false;
            }
        }

        // Team
        if (activeIndex == 1) {
            if (!this.teamUUID) {
                return false;
            }
        }

        // Role sets
        if (activeIndex == 2) {
            if (!this.roleSetName) {
                return false;
            }
        }

        return true;
    }

    createThePlan() {
        let team = this.store.teams.findOfThisTypeByUUID(this.teamUUID);
        let plan = new Plan(this.planName, team);
        plan.setStartDate(this.startDate);
        plan.setEndDate(this.endDate);

        // Add the roles
        this.chosenRoleSet.roles.forEach(r => {
            let role = this.store.roles.firstThisTypeByName(r.name, false);
            if (!role) {
                role = new Role(r.name, r.minimum_needed, r.maximum_needed, r.layout_priority);
                role.setDisplayOrder(r.display_order);

                this.store.roles.add(role);
            }
            plan.addRole(role);
        });

        // Add default assignments for everyone?
        team.people.forEach(p => {
            let randomIndex = Math.round(Math.random() * (this.chosenRoleSet.roles.length + 1));
            let clampedRandomRoleIndex = clamp(0, randomIndex, this.chosenRoleSet.roles.length - 1);
            let randomRoleName = this.chosenRoleSet.roles[clampedRandomRoleIndex].name;
            let role = this.store.roles.firstThisTypeByName(randomRoleName);
            plan.assignmentFor(p).addRole(role);
        });

        this.setIsSaving();
        this.store.plans.add(plan);
        this.server.savePlan(plan).then(() => {
            this.store.loggedInPerson.preferences.setSelectedPlan(plan);
            this.setIsNotSaving();
            this.navCtrl.pop();
        }, err => {
            this.pageUtils.showError(err);
            this.setIsNotSaving();
        });
    }

    selectStartDate() {
        let pop = this.popover.create(CalendarComponent, {
            range: false,
            daySelectedCallback: (event) => {
                runInAction(() => {
                    this.startDate = new Date(event.year, event.month, event.date);
                });
                return true;
            }
        }, {cssClass: 'calendar'});
        pop.present();
    }

    selectEndDate() {
        let pop = this.popover.create(CalendarComponent, {
            range: false,
            daySelectedCallback: (event) => {
                runInAction(() => {
                    this.endDate = new Date(event.year, event.month, event.date);
                });
                return true;
            }
        }, {cssClass: 'calendar'});
        pop.present();
    }
}
