import {Component} from '@angular/core';
import {ModalController, NavController} from 'ionic-angular';
import {RootStore} from "../../state/root";
import {CSVExporter} from "../../exporters/csv.exporter";
import {Storage} from "@ionic/storage";
import {GAPIS} from "../../common/gapis-auth";
import {autorun} from "mobx";
import {SheetSelectionPage} from "../sheet-selection/sheet-selection";


@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {

    constructor(public navCtrl: NavController,
                private storage: Storage,
                private sheetAPI: GAPIS,
                private modalController: ModalController,
                private rootStore: RootStore) {
    }

    ionViewDidEnter() {
        autorun(() => {
            if (this.rootStore.ui_store.signed_in) {
                if (this.rootStore.ui_store.google_sheet_id_retrieved) {
                    console.log("GOOOOO");
                    this.export_as_sheets();
                }
            }
        });
        this.sheetAPI.init();
    }

    clear_selection() {
        this.rootStore.ui_store.clear_selection();
    }

    export_as_sheets() {
        // Get the sheet and make sure we can read it.
        let sheet_id = this.sheetAPI.get_verified_sheet();
        sheet_id.subscribe((v) => {
            console.log("Top level caller got: " + JSON.stringify(v));
        }, (error) => {
            console.log("No sheet selected");
            // let popover = this.modalController.create(SheetSelectionPage);
            // popover.present().then(() => {
            // page is done.
            // console.log("Done. Sheet: " + this.rootStore.ui_store.google_sheet_id);
            // });
            this.navCtrl.push(SheetSelectionPage, {
                done: () => {
                    console.log("Done. Sheet: " + this.rootStore.ui_store.google_sheet_id);
                }
            });
        });
        // let exporter = new GoogleSheetExporter(this.rootStore.schedule, this.sheetAPI);
        // exporter.write_to_sheet();
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
