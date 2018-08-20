import {AfterContentInit, Component} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {CSVExporter} from "../../scheduling/exporter/csv.exporter";
import {Logger, LoggingService} from "ionic-logging-service";
import {RootStore} from "../../store/root";
import {LifecycleEvent, PageUtils} from "../page-utils";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {computed} from "mobx-angular";
import {delay, takeUntil} from "rxjs/operators";
import {LifecycleCallbacks} from "../../providers/server/interfaces";
import {NativePageTransitions} from "@ionic-native/native-page-transitions";
import {ConnectivityService} from "../../common/network/connectivity";
import {ResourceType} from "../../providers/access-control/access-control";
import {ObjectWithUUID} from "../../scheduling/base-types";
import {Subject} from "rxjs";

let __firstTime: boolean = true;

@IonicPage({
    name: 'home',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-home',
    templateUrl: 'home.html',
})
export class HomePage implements AfterContentInit {
    private logger: Logger;
    private id: string;
    private ngUnsubscribe: Subject<any>;

    constructor(private navCtrl: NavController,
                private pageUtils: PageUtils,
                private logService: LoggingService,
                private connectivity: ConnectivityService,
                private nativeTrans: NativePageTransitions,
                public server: SchedulerServer,
                public store: RootStore) {

        this.logger = this.logService.getLogger("page.home");
        this.id = ObjectWithUUID.guid();
        this.ngUnsubscribe = new Subject();
        this.logger.info('constructor', `Creating a HomePage object ${this.id}`);
    }

    showAbout() {
        this.navCtrl.push('page-about');
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
        this.logger.info('ngOnDestroy', `Destroy a HomePage object ${this.id}`);
    }

    ngAfterContentInit() {
        this.doStartupLifecycle();
    }

    private doStartupLifecycle() {
        this.pageUtils.runStartupLifecycleAsStream()
            .pipe(
                takeUntil(this.ngUnsubscribe),
                /*
                Dont debounce here - you can loose fast changes in state
                 */
                // debounceTime(500),
                delay(500)
            )
            .subscribe((event: LifecycleEvent) => {
                this.pageUtils.executeInZone(() => {
                    switch (event.event) {
                        case LifecycleCallbacks.showError: {
                            this.pageUtils.showError(event.args);
                            break;
                        }

                        case LifecycleCallbacks.applicationHasStarted: {
                            this.nativeTrans.fade({
                                duration: 1000,
                            });
                            this.logger.info(`doStartupLifecycle`, `runStartupLifecycle start...`);

                            // Note: I took this out when debugging multiple HomePage's being created.
                            // Not sure why it was in place.
                            //
                            // If I return here, and wonder "why did I take this out? It's needed in X, then *beware*!
                            // You'll get MULTIPLE instantiations of the HomePage (if that's where you start) if you just uncomment it
                            // this.navCtrl.setRoot('home', {});
                            break;
                        }

                        case LifecycleCallbacks.showLoginPage: {
                            this.logger.info("doStartupLifecycle", `show login page, because: ${event.args}`);
                            this.nativeTrans.fade({
                                duration: 1000,
                            });
                            this.navCtrl.setRoot('login', {});
                        }
                    }
                });
            }, err => {
                this.pageUtils.showError(err);
            }, () => {
                this.logger.info(`doStartupLifecycle`, 'runStartupLifecycle complete!');
                this.firstTimeRun();
            });
    }

    get canShare(): boolean {
        if(this.connectivity.onDevice) {
            return false;
        }
        return this.pageUtils.canManage(ResourceType.Plan);
    }

    // noinspection JSMethodCanBeStatic
    private firstTimeRun() {
        if (__firstTime) {
            // this.createTeamWizard();
            // this.createPlanWizard();

            // if (this.connectivity.onBrowser) {
            //     this.navCtrl.push('page-people', {create: true});
            // } else {
            //     this.navCtrl.push('page-profile');
            // }


            // this.navCtrl.push('login', {create: true});
            // this.navCtrl.push('page-db');
            // this.navCtrl.push('page-roles');
            // this.navCtrl.push('page-about');
            this.shareSchedule();
            // this.navCtrl.push('page-share');
            // this.navCtrl.push('page-people', {create: true});
            // this.navCtrl.push('page-teams', {create: true});
            // this.navCtrl.push('page-plans', {create: true});
            // this.navCtrl.push('page-test-utils', {create: true});
            __firstTime = false;
        }
    }

    @computed get hasNoPlans(): boolean {
        if (this.store) {
            if (this.store.plans) {
                return this.store.plans.length == 0;
            }
            return true;
        }
    }

    clear_selection() {
        this.store.ui_store.clear_selection();
    }

    shareSchedule() {
        if(this.canShare) {
            this.navCtrl.push('page-share');
        } else {
            console.warn(`Can't share, not enabled`);
        }
    }

    export_as_csv() {
        let exporter = new CSVExporter(this.store.schedule);
        exporter.write_to_file("schedule.csv");
    }

    startSignIn() {
        /* We do this because then whatever transitions we have in place will be the same */
        this.pageUtils.runStartupLifecycle(this.navCtrl);
    }

    editPlan(plan) {
        this.navCtrl.push('page-plan-details', {plan: this.store.ui_store.selectedPlan})
    }

    createPlanWizard() {
        this.navCtrl.push('page-plan-wizard')
    }

    createTeamWizard() {
        this.navCtrl.push('page-team-wizard')
    }

    showNotifications($event) {
        // For now, lets just show the profile
        this.navCtrl.push('page-profile');
        // let popover = this.popoverCtrlr.create(NotificationsComponent);
        // popover.present({ev: $event})
    }
}
