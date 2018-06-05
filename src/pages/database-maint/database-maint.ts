import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {NPBCStoreConstruction} from "../../providers/store/test.store";

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
                this.db.initialize(true);
                this.rootStore.load();
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
        // Store unavailabilty for all people. Hmm. Do I want this as a ref?
        NPBCStoreConstruction.SetupPeople(this.rootStore.people_store);

        for (let person of this.rootStore.people_store.people) {
            this.db.store_or_update_object(person);
        }
    }
}
