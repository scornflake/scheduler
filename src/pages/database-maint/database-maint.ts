import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {Team} from "../../scheduling/teams";
import {Organization} from "../../scheduling/organization";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {ClassMapping, PropertyMapping} from "../../providers/mapping/orm-mapper-type";
import {ObjectValidation} from "../../scheduling/shared";
import {Plan} from "../../scheduling/plan";
import {csd} from "../../scheduling/common/date-utils";
import {NPBCStoreConstruction} from "../../tests/test.store";

@IonicPage({
    name: 'page-db',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-database-maint',
    templateUrl: 'database-maint.html',
})
export class DatabaseMaintPage {

    database_type: string = "";

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public rootStore: RootStore,
                public mapper: OrmMapper,
                public pageUtils: PageUtils,
                public navParams: NavParams,
                public db: SchedulerDatabase) {
    }

    ionViewDidLoad() {
        this.db.ready_event.subscribe(() => {
            if (this.db.info.backend_adapter) {
                let type = this.db.info.backend_adapter.toString();
                if (this.db.info['sqlite_plugin']) {
                    type += ", sqllite";
                }
                this.database_type = type;
            } else {
                this.database_type = `Unknown`;
            }
        })
    }

    get database_info() {
        let info = [];
        if (this.db.info) {
            for (let key of Object.keys(this.db.info)) {
                let value = this.db.info[key];
                info.push({label: key, value: value})
            }
        }
        return info;
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
        let props: Map<string, PropertyMapping> = this.mapper.propertiesFor(cf.name);
        return Array.from(props.keys());
    }

    stats_for_team_people(team: Team) {
        return team.people.map(t => {
            return {label: t.name, value: t.availability}
        })
    }

    stats_for_teams(teams: Team[]) {
        return teams.map(t => {
            let one_item = {
                next: () => this.stats_for_team_people(t),
                label: t.name,
                value: t.people.length,
            };
            console.log(`team item: ${t.name}: ${JSON.stringify(one_item)}`);
            return one_item
        });
    }

    get stats() {
        let teams = this.rootStore.teams;
        return [
            {label: 'Num orgs', value: this.rootStore.organization ? 1 : 0},
            {label: 'Num people', value: this.rootStore.people.length},
            {label: 'Num plans', value: this.rootStore.plans.length},
            {label: 'Num teams', value: teams.length, next: () => this.stats_for_teams(teams.teams)}
        ];
    }

    async store_fake_data() {
        /*
        Need an organization
         */
        if (!this.rootStore.organization) {
            this.rootStore.organization = new Organization("North Porirua Baptist Church");
            await this.db.async_store_or_update_object(this.rootStore.organization);
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
            await this.db.async_store_or_update_object(person);
        }

        if (people_added.length > 0) {
            this.pageUtils.show_message(`${people_added.length} people added`);
        }

        await this.db.async_store_or_update_object(defaultTeam);
        let plan = this.setup_fake_draft_plan(defaultTeam);
        await this.db.async_store_or_update_object(plan);
    }

    private setup_fake_draft_plan(team: Team): Plan {
        // make up a default team
        // for testing, create some fake
        let plan = this.rootStore.plans.firstThisTypeByName("Sunday Morning Service");
        if (plan == null) {
            plan = this.rootStore.plans.add(new Plan("Sunday Morning Service", team));
            this.pageUtils.show_message('Adding new default plan')
        }
        plan.start_date = csd(2018, 6, 3);
        plan.end_date = csd(2018, 9, 30);

        NPBCStoreConstruction.AttachRolesToPlan(plan);

        try {
            NPBCStoreConstruction.AddPeopleToPlanWithRoles(plan, team);
        } catch (e) {
            // oh oh.
            let ve = ObjectValidation.simple("Cannot setup default fake plan. Is the DB OK? " + e.toString().substr(0, 100));
            this.pageUtils.show_validation_error(ve, true);
        }

        return plan;
    }

    toggleGroup(label: any) {

    }
}
