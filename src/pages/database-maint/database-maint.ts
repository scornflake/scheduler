import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {NPBCStoreConstruction} from "../../providers/store/test.store";
import {PageUtils} from "../page-utils";

@IonicPage({
    name: 'page-db',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-database-maint',
    templateUrl: 'database-maint.html',
})
export class DatabaseMaintPage {

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams,
                public db: SchedulerDatabase) {
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad DatabaseMaintPage');
    }

    delete_db() {
        let alert = this.alertCtrl.create({title: "Sure? This is .... destructive!!!"});
        alert.addButton({
            text: 'No',
            role: 'cancel'
        });
        alert.addButton({
            text: "Yes",
            handler: () => {
                this.db.delete_all();

                // does a reload, so no need to take action after
            }
        });
        alert.present();
    }

    get stats() {
        return [
            {label: 'Num people', value: this.rootStore.people_store.people.length},
            {label: 'Num teams', value: this.rootStore.teams_store.teams.length}
        ]
    }

    store_fake_data() {
        let people_added = NPBCStoreConstruction.SetupPeople(this.rootStore.people_store);
        for (let person of people_added) {
            this.db.store_or_update_object(person);
        }
        if (people_added.length > 0) {
            this.pageUtils.show_message(`${people_added.length} people added`);
        }
    }
}
