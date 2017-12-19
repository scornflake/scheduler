import {ApplicationRef, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {GAPIS} from "../../common/gapis-auth";
import {RootStore} from "../../state/root";
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

    private done: (ss: Spreadsheet, sheet: Sheet, error?) => void = null;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                private ar: ApplicationRef,
                private rootStore: RootStore,
                private api: GAPIS) {
        this.sheets = [];
        this.done = navParams.get('done');
    }

    ionViewDidEnter() {
        this.loadSheets();
    }

    ionViewDidLeave() {
    }

    selectSheet(sheet_metadata) {
        if(sheet_metadata) {
            console.log("Clicked: " + JSON.stringify(sheet_metadata));
            this.rootStore.state.google_sheet_id = sheet_metadata.id;

            // Push on the tab navigator
            this.navCtrl.push(TabSelectionPage, {
                'sheet_id': sheet_metadata.id,
                'done': (ss: Spreadsheet, sheet: Sheet, error) => {
                    if (error) {
                        this.done(null, null, error);
                    } else {
                        this.rootStore.state.google_sheet_tab_id = sheet.properties.sheetId;
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
            console.log("Finished loading: " + this.sheets.length + " items");
            this.loading = false;
            this.ar.tick();
        });
    }
}
