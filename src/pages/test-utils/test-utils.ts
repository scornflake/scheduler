import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";

@IonicPage({
    name: 'page-test-utils'
})
@Component({
    selector: 'page-test-utils',
    templateUrl: 'test-utils.html',
})
export class TestUtilsPage {

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    ionViewDidLoad() {
    }

    ngOnInit() {
        // If no DB, kick page utils?
        this.pageUtils.runStartupLifecycle(this.navCtrl);
    }
}
