import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {NPBCStoreConstruction} from "../../providers/store/test.store";
import {PageUtils} from "../page-utils";
import {Team} from "../../scheduling/teams";
import {Organization} from "../../scheduling/organization";

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
        let st = [
            {label: 'Num orgs', value: this.rootStore.organization_store.organizations.length},
            {label: 'Num people', value: this.rootStore.people_store.people.length},
            {label: 'Num teams', value: this.rootStore.teams_store.teams.length}
        ];
        this.rootStore.teams_store.teams.forEach(t => {
            st.push({label: ` - ${t.name}`, value: t.people.length});
            t.people.forEach(p => {
                st.push({label: ` -- ${p.name}`, value: 0})
            })
        });
        return st;
    }

    store_fake_data() {
        /*
        Need an organization
         */

        let new_org = NPBCStoreConstruction.SetupOrganization(this.rootStore.organization_store, "North Porirua Baptist Church");
        if (new_org) {
            this.db.store_or_update_object(new_org);
            this.pageUtils.show_message("Added default org");
        }

        let peopleStore = this.rootStore.people_store;
        let people_added = NPBCStoreConstruction.SetupPeople(peopleStore);
        for (let person of people_added) {
            this.db.store_or_update_object(person);
        }
        if (people_added.length > 0) {
            this.pageUtils.show_message(`${people_added.length} people added`);
        }


        /*
        Teams need people!
         */
        // make up a default team
        let teamsStore = this.rootStore.teams_store;
        let defaultTeam = teamsStore.find_by_name("Default");
        if (!defaultTeam) {
            let team = new Team("Default", peopleStore.people);
            teamsStore.add_team(team);
            this.db.store_or_update_object(team);
            this.pageUtils.show_message("Added default team");
        }

    }
}
