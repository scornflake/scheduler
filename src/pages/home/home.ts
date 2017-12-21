import {Component} from '@angular/core';
import {ModalController, NavController} from 'ionic-angular';
import {RootStore} from "../../state/root";
import {CSVExporter} from "../../exporters/csv.exporter";
import {GAPIS} from "../../common/gapis-auth";
import {SheetSelectionPage} from "../sheet-selection/sheet-selection";


@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {

    constructor(public navCtrl: NavController,
                private sheetAPI: GAPIS,
                private modalController: ModalController,
                private rootStore: RootStore) {
    }

    ionViewDidEnter() {
        this.sheetAPI.init();
    }

    clear_selection() {
        this.rootStore.ui_store.clear_selection();
    }

    export_as_sheets() {
        // Get the sheet and make sure we can read it.
        let sheet_id = this.sheetAPI.state.google_sheet_id;
        if (sheet_id) {
            this.sheetAPI.load_sheet_with_id(sheet_id).subscribe((spreadsheet) => {
                console.log("Loaded the sheet!");
                let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == this.rootStore.state.google_sheet_tab_id);
                this.sheetAPI.clear_and_write_schedule(spreadsheet, sheet, this.rootStore.schedule);
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
                done: (spreadsheet, sheet, error) => {
                    console.log("Done. Selected sheet: " + spreadsheet.spreadsheetId + ", and tab: " + sheet.properties.title);
                }
            });
        }
    }

    clear_sheet_state() {
        this.rootStore.ui_store.clear_sheet_state();
    }

    export_as_csv() {
        let exporter = new CSVExporter(this.rootStore.schedule);
        exporter.write_to_file("schedule.csv");
    }

    login() {
        this.sheetAPI.authenticate();
    }

    logout() {
        this.sheetAPI.signout();
    }
}
