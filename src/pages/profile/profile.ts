import {ChangeDetectionStrategy, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {Availability, AvailabilityUnit} from "../../scheduling/availability";

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
        // this.store.loggedInPerson$.subscribe(p => {
        //     console.warn(`ProfilePage sees: ${SafeJSON.stringify(p)}`)
        // })
        this.pageUtils.runStartupLifecycle(this.navCtrl);
    }

    // changeAvail() {
    //     let p = this.store.loggedInPerson;
    //     if(p) {
    //         p.availability = new Availability(Math.floor(Math.random() * 3) + 1, AvailabilityUnit.EVERY_N_WEEKS)
    //     }
    // }
}
