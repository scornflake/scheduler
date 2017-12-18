import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {GAPIS} from "../../common/gapis-auth";

@IonicPage()
@Component({
    selector: 'page-sheet-selection',
    templateUrl: 'sheet-selection.html',
})
export class SheetSelectionPage {
    public sheets: Array<any>;
    public loading: boolean = false;

    private done: any = null;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                private api: GAPIS) {
        this.sheets = [];
        this.done = navParams.get('done');
    }

    ionViewDidEnter() {
        this.loadSheets();
    }

    ionViewDidLeave() {
        if (this.done) {
            this.done();
        }
    }

    private loadSheets() {
        this.loading = true;
        this.api.list_all_sheets().subscribe((sheets) => {
            this.sheets = Array.from(sheets);
            console.log("Finished loading: " + this.sheets.length + " items");
            this.loading = false;
        });
    }
}
