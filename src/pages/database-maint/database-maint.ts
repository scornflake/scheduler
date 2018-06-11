import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {NPBCStoreConstruction} from "../../providers/store/test.store";
import {PageUtils} from "../page-utils";
import {Team} from "../../scheduling/teams";
import {Organization} from "../../scheduling/organization";
import {ClassMapping, OrmMapper} from "../../providers/mapping/orm-mapper";
import {PersistenceType} from "../../providers/mapping/orm-mapper-type";

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
                public mapper: OrmMapper,
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

    get classFactories(): ClassMapping[] {
        let defs = this.mapper.definitions;
        return Array.from(defs.values());
    }

    propertiesFor(cf: ClassMapping): string[] {
        let props: Map<string, PersistenceType> = this.mapper.propertiesFor(cf.name);
        return Array.from(props.keys());
    }

    get stats() {
        let teams = this.rootStore.teams;
        let st = [
            {label: 'Num orgs', value: this.rootStore.organization ? 1 : 0},
            {label: 'Num people', value: this.rootStore.people.length},
            {label: 'Num teams', value: teams.length},
        ];
        teams.forEach(t => {
            st.push({label: `Team: ${t.name}`, value: t.people.length});
            t.people.forEach(p => {
                st.push({label: ` --  ${t.name}.${p.name}, av: ${p.availability}`, value: 0})
            })
        });
        return st;
    }

    store_fake_data() {
        /*
        Need an organization
         */
        if (!this.rootStore.organization) {
            this.rootStore.organization = new Organization("North Porirua Baptist Church");
            this.db.store_or_update_object(this.rootStore.organization);
            this.pageUtils.show_message("Added default org");
        }

        // This gets us the people.
        // NOTE: This sets up default availability. No 'unavailable' tho.
        let people_added = NPBCStoreConstruction.SetupPeople(this.rootStore.people);

        /*
        Teams need people!
        This sets unavailability
         */
        let teamManager = this.rootStore.teams;
        let defaultTeam = teamManager.firstThisTypeByName("Default");
        if (!defaultTeam) {
            defaultTeam = new Team("Default", this.rootStore.people.all);
            teamManager.add(defaultTeam);
            this.pageUtils.show_message("Added default team");
        }

        NPBCStoreConstruction.SetupTeamUnavailability(defaultTeam);

        for (let person of people_added) {
            this.db.store_or_update_object(person);
        }

        if (people_added.length > 0) {
            this.pageUtils.show_message(`${people_added.length} people added`);
        }

        this.db.store_or_update_object(defaultTeam);
    }
}
