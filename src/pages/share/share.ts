import {Component, forwardRef, Inject, OnInit} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {GAPIS} from "../../common/gapis-auth";
import {Logger, LoggingService} from "ionic-logging-service";
import {SheetSelectionPage} from "../sheet-selection/sheet-selection";
import {RootStore} from "../../store/root";
import {Preferences} from "../../scheduling/people";
import {computed} from "mobx-angular";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import {PageUtils} from "../page-utils";
import {SWBSafeJSON} from "../../common/json/safe-stringify";

@IonicPage({
    name: 'page-share',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-share',
    templateUrl: 'share.html',
})
export class SharePage implements OnInit {
    private logger: Logger;

    selectedSheet: Spreadsheet;
    selectedSheetTabName: string = "";
    isExporting: boolean;
    exportProgress: number;

    constructor(public navCtrl: NavController,
                @Inject(forwardRef(() => GAPIS)) public sheetAPI,
                private store: RootStore,
                private pageUtils: PageUtils,
                private logService: LoggingService,
                public navParams: NavParams) {
        this.logger = this.logService.getLogger("page.share");
    }

    ngOnInit() {
        if (this.store.loggedInPerson == null) {
            this.navCtrl.pop();
        }

        this.sheetAPI.selectedSheet$.subscribe(aSheet => {
            this.selectedSheet = aSheet;
            if (aSheet) {
                const tabId = this.preferences.google_sheet_tab_id;
                if (tabId) {
                    let sheet = this.sheetAPI.findSheetWithIDIn(aSheet, tabId);
                    if (sheet !== undefined) {
                        this.selectedSheetTabName = sheet.properties.title;
                    } else {
                        this.selectedSheetTabName = "<not selected>";
                    }
                } else {
                    this.selectedSheetTabName = "<not selected>";
                }
            }
        })
    }

    get canExportSheet(): boolean {
        if (this.isExporting) {
            return false;
        }
        return this.selectedSheet !== undefined && this.preferences.google_sheet_tab_id != null;
    }

    exportScheduleToSheet() {
        if (!this.canExportSheet) {
            return;
        }
        this.exportProgress = 0;
        this.store.schedule$.subscribe(schedule => {
            if (schedule) {
                let sheet = this.sheetAPI.findSheetWithIDIn(this.selectedSheet, this.preferences.google_sheet_tab_id);
                this.sheetAPI.clearAndWriteSchedule(this.selectedSheet, sheet, schedule).subscribe(progress => {
                    this.isExporting = true;
                    this.exportProgress = progress * 100;
                }, err => {
                    let message = err['result']['error']['message'] || err;
                    this.logger.error(`Error: ${SWBSafeJSON.stringify(message)}`);
                    this.pageUtils.showError(message, true);
                    this.isExporting = false;
                }, () => {
                    this.isExporting = false;
                    this.pageUtils.showMessage('Exported successfully');
                })
            }
        });
    }

    @computed get loggedInToGoogle(): boolean {
        return this.sheetAPI.isSignedInToGoogle;
    }

    loginToGoogle() {
        this.sheetAPI.authenticate().subscribe();
    }

    logoutOfGoogle() {
        this.sheetAPI.signout().subscribe();
    }

    get preferences(): Preferences {
        if (this.store) {
            if (this.store.loggedInPerson) {
                return this.store.loggedInPerson.preferences;
            }
        }
        return null;
    }

    clearSheetSelection() {
        this.preferences.clearSelectedSheet();
    }

    selectSheetToExportInto() {
        // Get the sheet and make sure we can read it.
        let prefs = this.preferences;
        if (!prefs) {
            this.logger.error(`No preferences. Can't do stuff`);
            return;
        }

        this.navCtrl.push(SheetSelectionPage, {
            title: "Select sheet to export into",
            tab_title: "Select tab to export into",
            done: (spreadsheet, sheet, error) => {
                prefs.setSheetToExportTo(spreadsheet.spreadsheetId, sheet.properties.sheetId);
                console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title);
            }
        });
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


}
