import {Component} from '@angular/core';
import {IonicPage, NavController, Platform, PopoverController} from 'ionic-angular';
import {CSVExporter} from "../../scheduling/exporter/csv.exporter";
import {GAPIS} from "../../common/gapis-auth";
import {Logger} from "ionic-logging-service";
import {RootStore} from "../../store/root";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {LifecycleEvent, PageUtils} from "../page-utils";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {computed} from "mobx-angular";
import {debounceTime, delay} from "rxjs/operators";
import {LifecycleCallbacks} from "../../providers/server/interfaces";

let __firstTime: boolean = true;

@IonicPage({
    name: 'home',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-home',
    templateUrl: 'home.html',
})
export class HomePage {
    private logger: Logger;

    constructor(private navCtrl: NavController,
                private sheetAPI: GAPIS,
                private pageUtils: PageUtils,
                private platform: Platform,
                private popoverCtrlr: PopoverController,
                public server: SchedulerServer,
                public store: RootStore) {

        this.logger = LoggingWrapper.getLogger("page.home");
    }

    // ngDoCheck() {
    //     // console.warn(`HomePage is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`HomePage has changes`)
    // }

    showAbout() {
        this.navCtrl.push('page-about');
    }

    ngOnInit() {
        // this.sheetAPI.init();
        this.pageUtils.runStartupLifecycleAsStream()
            .pipe(
                debounceTime(500),
                delay(500)
            )
            .subscribe((event: LifecycleEvent) => {
                switch (event.event) {
                    case LifecycleCallbacks.showError: {
                        this.pageUtils.showError(event.args);
                        break;
                    }

                    case LifecycleCallbacks.applicationHasStarted: {
                        this.navCtrl.setRoot('home', {});
                        break;
                    }

                    case LifecycleCallbacks.showLoginPage: {
                        this.logger.info(`show login page, because: ${event.args}`);
                        this.navCtrl.setRoot('login', {});
                    }
                }
            }, err => {
                this.pageUtils.showError(err);
            }, () => {
                this.logger.info(`ngOnInit`, 'runStartupLifecycle complete!');
                this.firstTimeRun();
            });

    }

    private firstTimeRun() {
        if (__firstTime) {
            // this.createTeamWizard();
            // this.createPlanWizard();

            // if (this.platform.is('cordova')) {
            //     this.navCtrl.push('page-people', {create: true});
            // } else {
            //     this.navCtrl.push('page-profile');
            // }


            // this.navCtrl.push('login', {create: true});
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

    select_previous_schedule() {
        // this.navCtrl.push(SheetSelectionPage, {
        //     title: "Select sheet to use as previous schedule",
        //     tab_title: "Select tab to use as previous schedule",
        //     done: (spreadsheet, sheet, error) => {
        //         console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title + ", " + sheet.properties.sheetId);
        //         this.store.state.previous_sheet_id = spreadsheet.spreadsheetId;
        //         this.store.state.previous_sheet_tab_id = sheet.properties.sheetId;
        //     }
        // });
    }

    read_as_previous_schedule() {
        // if (this.store.ui_store.preferences.have_previous_selection) {
        //     let sheet_id = this.store.ui_store.preferences.previous_sheet_id;
        //     this.sheetAPI.load_sheet_with_id(sheet_id).subscribe((spreadsheet) => {
        //         let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == this.store.state.previous_sheet_tab_id);
        //         this.sheetAPI.read_spreadsheet_data(spreadsheet, sheet).subscribe(rows => {
        //
        //             let reader = new SpreadsheetReader(this.store.people);
        //             reader.parse_schedule_from_spreadsheet(rows);
        //
        //             if (reader.has_problems) {
        //                 let dump_map = {};
        //                 for (let key of Array.from(reader.problems.keys())) {
        //                     dump_map[key] = Array.from(reader.problems.get(key));
        //                 }
        //                 let problems = toJS(dump_map);
        //                 let s = SafeJSON.stringify(problems);
        //                 this.logger.info(`Had problems: ${s}`);
        //             }
        //             this.logger.info("Made schedule!");
        //             this.store.setPreviousSchedule(reader.schedule);
        //         });
        //     });
        // }
    }

    export_as_sheets() {
        // // Get the sheet and make sure we can read it.
        // let sheet_id = this.sheetAPI.state.google_sheet_id;
        // if (sheet_id) {
        //     this.sheetAPI.load_sheet_with_id(sheet_id).subscribe((spreadsheet) => {
        //         console.log("Loaded the sheet!");
        //         let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == this.store.state.google_sheet_tab_id);
        //         this.sheetAPI.clear_and_write_schedule(spreadsheet, sheet, this.store.schedule);
        //     }, (error) => {
        //         console.log("Error loading sheet: " + error);
        //     });
        // } else {
        //     console.log("No sheet selected");
        //     // let popover = this.modalController.create(SheetSelectionPage);
        //     // popover.present().then(() => {
        //     // page is done.
        //     // console.log("Done. Sheet: " + this.rootStore.ui_store.google_sheet_id);
        //     // });
        //     this.navCtrl.push(SheetSelectionPage, {
        //         title: "Select sheet to export into",
        //         tab_title: "Select tab to export into",
        //         done: (spreadsheet, sheet, error) => {
        //             this.store.state.google_sheet_id = spreadsheet.spreadsheetId;
        //             this.store.state.google_sheet_tab_id = sheet.properties.sheetId;
        //             console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title);
        //         }
        //     });
        // }
    }

    export_as_csv() {
        let exporter = new CSVExporter(this.store.schedule);
        exporter.write_to_file("schedule.csv");
    }

    login() {
        this.sheetAPI.authenticate();
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
        // For not, lets just show the profile
        this.navCtrl.push('page-profile');
        // let popover = this.popoverCtrlr.create(NotificationsComponent);
        // popover.present({ev: $event})
    }
}
