import {ApplicationRef, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {GAPIS} from "../../common/gapis-auth";
import {Logger, LoggingService} from "ionic-logging-service";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;

@IonicPage()
@Component({
    selector: 'page-tab-selection',
    templateUrl: 'tab-selection.html',
})
export class TabSelectionPage {
    loading: boolean = false;

    title: string;
    sheets = [];
    sheet_id: string;

    private done: (ss: Spreadsheet, sheet: Sheet, error?) => void = null;
    private spreadsheet: gapi.client.sheets.Spreadsheet;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                private ar: ApplicationRef,
                private logSvc: LoggingService,
                private api: GAPIS) {

        this.logger = this.logSvc.getLogger('page.sheet.select');
        this.sheet_id = navParams.get('sheet_id');
        this.done = navParams.get('done');
        this.title = navParams.get('title') || "Select a sheet to use";
    }

    ionViewDidLoad() {
        this.logger.info(`Tab Selection is loading sheet with ID: ${this.sheet_id}`);
        this.api.load_sheet_with_id(this.sheet_id).subscribe((spreadsheet) => {
                this.loading = false;
                this.sheets = spreadsheet.sheets;
                this.spreadsheet = spreadsheet;
            this.ar.tick();
        }, err => {
            console.log("Can't load the spreadsheet. Arg: " + err);
            this.done(null, null, err);
            this.navCtrl.pop();
        });
    }

    select_sheet(sheet) {
        // console.log("Selected: " + sheet);
        if (this.done) {
            this.done(this.spreadsheet, sheet);
        }
        this.navCtrl.pop();
    }

}
