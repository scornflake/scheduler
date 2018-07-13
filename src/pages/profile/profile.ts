import {ChangeDetectionStrategy, Component} from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    ngOnInit() {
        // No person? well, can't show much can we
        if (this.store.loggedInPerson == null) {
            this.navCtrl.pop();
        }
    }
}
