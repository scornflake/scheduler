import {ApplicationRef, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {GAPIS} from "../../common/gapis-auth";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;
import {TabSelectionPage} from "../tab-selection/tab-selection";

@IonicPage()
@Component({
    selector: 'page-sheet-selection',
    templateUrl: 'sheet-selection.html',
})
export class SheetSelectionPage {
    public sheets: Array<any>;
    public loading: boolean = false;
    public title: string = "foo";

    private done: (ss: Spreadsheet, sheet: Sheet, error?) => void = null;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                private ar: ApplicationRef,
                private api: GAPIS) {
        this.sheets = [];
        this.done = navParams.get('done');
        this.title = navParams.get('title') || "Select a sheet to use";
    }

    ionViewDidEnter() {
        this.loadSheets();
    }

    ionViewDidLeave() {
    }

    selectSheet(sheet_metadata) {
        if (sheet_metadata) {
            // console.log("Clicked: " + SafeJSON.stringify(sheet_metadata));
            // this.rootStore.state.google_sheet_id = sheet_metadata.id;

            // Push on the tab navigator
            let tab_title = this.navParams.get('tab_title') || 'Select tab to use';
            this.navCtrl.push(TabSelectionPage, {
                'sheet_id': sheet_metadata.id,
                'title' : tab_title,
                'done': (ss: Spreadsheet, sheet: Sheet, error) => {
                    if (error) {
                        this.done(null, null, error);
                    } else {
                        this.done(ss, sheet);
                    }
                    this.navCtrl.pop();
                }
            });
        }
    }

    private loadSheets() {
        this.loading = true;
        this.api.list_all_sheets().subscribe((sheets) => {
            this.sheets = Array.from(sheets);
            // console.log("Finished loading: " + this.sheets.length + " items");
            this.loading = false;
            this.ar.tick();
        });
    }
}
