import {Component} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {CSVExporter} from "../../scheduling/exporter/csv.exporter";
import {GAPIS} from "../../common/gapis-auth";
import {SheetSelectionPage} from "../sheet-selection/sheet-selection";
import {Logger, LoggingService} from "ionic-logging-service";
import {toJS} from "mobx";
import {SpreadsheetReader} from "../../common/spreadsheet_reader";
import {RESTServer} from "../../providers/server/server";
import {RootStore} from "../../store/root";
import {SafeJSON} from "../../common/json/safe-stringify";
import {Plan} from "../../scheduling/plan";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";


@IonicPage({
    defaultHistory: ['home'],
    name: 'home'
})
@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {
    private logger: Logger;

    constructor(public navCtrl: NavController,
                private loggingService: LoggingService,
                private sheetAPI: GAPIS,
                private server: SchedulerServer,
                public store: RootStore) {
        this.logger = this.loggingService.getLogger("page.home");
    }

    ionViewDidEnter() {
        this.sheetAPI.init();

        let readyEvent = this.store.ready_event;
        readyEvent.subscribe(value => {
            if (value) {
                let validateLoginToken = this.server.validateLoginToken();
                validateLoginToken.then(resp => {
                    if (!resp.ok) {
                        this.logger.info(`Validation returned: ${SafeJSON.stringify(resp)}`);
                        this.navCtrl.push('login');
                    } else {

                    }
                });
            }
        });
    }

    clear_selection() {
        this.store.ui_store.clear_selection();
    }

    ssss(thing: any) {
        return SafeJSON.stringify(thing);
    }

    get plansByDateLatestFirst(): Array<Plan> {
        // Sort by date, latest first
        return this.store.plans.plansByDateLatestFirst;
    }

    plan_title(p: Plan): string {
        return `${p.name} ${p.start_date}-${p.end_date}`
    }

    select_previous_schedule() {
        this.navCtrl.push(SheetSelectionPage, {
            title: "Select sheet to use as previous schedule",
            tab_title: "Select tab to use as previous schedule",
            done: (spreadsheet, sheet, error) => {
                console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title + ", " + sheet.properties.sheetId);
                this.store.state.previous_sheet_id = spreadsheet.spreadsheetId;
                this.store.state.previous_sheet_tab_id = sheet.properties.sheetId;
            }
        });
    }

    read_as_previous_schedule() {
        if (this.store.ui_store.saved_state.have_previous_selection) {
            let sheet_id = this.store.ui_store.saved_state.previous_sheet_id;
            this.sheetAPI.load_sheet_with_id(sheet_id).subscribe((spreadsheet) => {
                let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == this.store.state.previous_sheet_tab_id);
                this.sheetAPI.read_spreadsheet_data(spreadsheet, sheet).subscribe(rows => {

                    let reader = new SpreadsheetReader(this.store.people);
                    reader.parse_schedule_from_spreadsheet(rows);

                    if (reader.has_problems) {
                        let dump_map = {};
                        for (let key of Array.from(reader.problems.keys())) {
                            dump_map[key] = Array.from(reader.problems.get(key));
                        }
                        let problems = toJS(dump_map);
                        let s = SafeJSON.stringify(problems);
                        this.logger.info(`Had problems: ${s}`);
                    }
                    this.logger.info("Made schedule!");
                    this.store.set_previous_schedule(reader.schedule);
                });
            });
        }
    }

    export_as_sheets() {
        // Get the sheet and make sure we can read it.
        let sheet_id = this.sheetAPI.state.google_sheet_id;
        if (sheet_id) {
            this.sheetAPI.load_sheet_with_id(sheet_id).subscribe((spreadsheet) => {
                console.log("Loaded the sheet!");
                let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == this.store.state.google_sheet_tab_id);
                this.sheetAPI.clear_and_write_schedule(spreadsheet, sheet, this.store.schedule);
            }, (error) => {
                console.log("Error loading sheet: " + error);
            });
        } else {
            console.log("No sheet selected");
            // let popover = this.modalController.create(SheetSelectionPage);
            // popover.present().then(() => {
            // page is done.
            // console.log("Done. Sheet: " + this.rootStore.ui_store.google_sheet_id);
            // });
            this.navCtrl.push(SheetSelectionPage, {
                title: "Select sheet to export into",
                tab_title: "Select tab to export into",
                done: (spreadsheet, sheet, error) => {
                    this.store.state.google_sheet_id = spreadsheet.spreadsheetId;
                    this.store.state.google_sheet_tab_id = sheet.properties.sheetId;
                    console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title);
                }
            });
        }
    }

    clear_sheet_state() {
        this.store.ui_store.clear_sheet_state();
    }

    export_as_csv() {
        let exporter = new CSVExporter(this.store.schedule);
        exporter.write_to_file("schedule.csv");
    }

    login() {
        this.sheetAPI.authenticate();
    }

    logout() {
        // Throw away our login token
        // this.rootStore.ui_store.logout();
        this.sheetAPI.signout();
    }
}
