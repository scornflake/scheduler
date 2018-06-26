import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";

@IonicPage({
    name: 'page-profile',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-profile',
    templateUrl: 'profile.html',
})
export class ProfilePage {

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    ngOnInit() {
        // this.store.loggedInPerson$.subscribe(p => {
        //     console.warn(`ProfilePage sees: ${SafeJSON.stringify(p)}`)
        // })
        this.pageUtils.runStartupLifecycle(this.navCtrl);
    }

}
