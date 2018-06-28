import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {NetworkUtils} from "../../common/network/nework";

@IonicPage({
    name: 'page-test-utils',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-test-utils',
    templateUrl: 'test-utils.html',
})
export class TestUtilsPage {

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public netUtil: NetworkUtils,
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
