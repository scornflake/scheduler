import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {SchedulerDatabase} from "../../providers/server/db";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {Team} from "../../scheduling/teams";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {ClassMapping, PropertyMapping} from "../../providers/mapping/orm-mapper-type";
import {ObjectValidation} from "../../scheduling/shared";
import {Plan} from "../../scheduling/plan";
import {csd} from "../../scheduling/common/date-utils";
import {NPBCStoreConstruction} from "../../tests/test.store";
import {Logger, LoggingService} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {Subscription} from "rxjs/Subscription";
import {action, computed, observable} from "mobx-angular";
import {runInAction} from "mobx";
import {HttpClient} from "@angular/common/http";

import Faker from "faker";
import {Person} from "../../scheduling/people";
import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../../scheduling/availability";

@IonicPage({
    name: 'page-db',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-database-maint',
    templateUrl: 'database-maint.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatabaseMaintPage implements OnDestroy {
    @observable databaseType: string = "";

    private logger: Logger;
    private dbSubscription: Subscription;

    @observable private db: SchedulerDatabase;

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public store: RootStore,
                public server: SchedulerServer,
                public http: HttpClient,
                private logService: LoggingService,
                public mapper: OrmMapper,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.logger = this.logService.getLogger('page.dbmaint');
    }

    ngOnDestroy() {
        if (this.dbSubscription) {
            this.dbSubscription.unsubscribe();
        }
    }

    ngOnInit() {
        // If no DB, kick page utils?
        this.pageUtils.runStartupLifecycle(this.navCtrl);

        this.dbSubscription = this.server.db$.subscribe(db => {
            runInAction(() => {
                this.db = db;
                if (db) {
                    if (this.db.info.backend_adapter) {
                        let type = this.db.info.backend_adapter.toString();
                        if (this.db.info['sqlite_plugin']) {
                            type += ", sqllite";
                        }
                        this.databaseType = type;
                    } else {
                        this.databaseType = this.db.info['adapter'] || "Unknown";
                    }
                }
            });
        });
    }

    @computed get database_info() {
        let info = [];
        if (this.db) {
            if (this.db.info) {
                for (let key of Object.keys(this.db.info)) {
                    let value = this.db.info[key];
                    info.push({label: key, value: value})
                }
            }
        }
        return info;
    }


    deleteAllContent() {
        let alert = this.alertCtrl.create({title: "Sure? This is ... really destructive (and no undo) !!!"});
        alert.addButton({
            text: 'No',
            role: 'cancel'
        });
        alert.addButton({
            text: "Yes",
            handler: () => {
                this.server.deleteAllContentFromDatabase().then(() => {
                    this.logger.info(`Deleted everything`);
                    location.reload();
                });
            }
        });
        alert.present();
    }

    destroyDb() {
        let alert = this.alertCtrl.create({title: "Sure? This is .... destructive!!!"});
        alert.addButton({
            text: 'No',
            role: 'cancel'
        });
        alert.addButton({
            text: "Yes",
            handler: () => {
                this.db.destroyDatabase().then(() => {
                    /*
                    Must reload the page / app, to get a new DB.
                     */
                    this.logger.info(`starting destroy of db...`);
                    location.reload();
                });
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

    @computed get stats() {
        let teams = this.store.teams;
        return [
            {label: 'Num orgs', value: this.store.organizations.length},
            {label: 'Num roles', value: this.store.roles.length},
            {label: 'Num people', value: this.store.people.length},
            {label: 'Num plans', value: this.store.plans.length},
            {label: 'Num teams', value: teams.length, next: () => this.stats_for_teams(teams.teams)}
        ];
    }

    @action add100People() {
        for (let i = 0; i < 100; i++) {
            let newPerson = new Person();
            newPerson.setName(Faker.name.findName());
            newPerson.setEmail(Faker.internet.email());
            newPerson.setPhone(Faker.phone.phoneNumber());
            this.store.people.add(newPerson);
            this.server.savePerson(newPerson).then(() => {
                this.logger.debug(`saved person: ${newPerson.name}`);
            });
        }
        this.pageUtils.showMessage(`Added 100 people`);
    }

    @action change100People() {
        let personManager = this.store.people;
        for (let i = 0; i < 100; i++) {
            let editType = Math.round(Math.random() * 4);
            let randomNum = Math.round(Math.random() * personManager.length);
            let person = this.store.people.people[randomNum];
            this.logger.debug(`Make change ${editType} to index ${person.name}`);

            if (editType == 1) {
                person.setPhone(Faker.phone.phoneNumber());
            } else if (editType == 2) {
                person.availability = DatabaseMaintPage.randomAvailability();
            } else if (editType == 3) {
                person.setEmail(Faker.internet.email());
            } else if (editType == 0) {
                person.preferences.google_sheet_id = Math.random() * 400 + "";
            }
        }
        this.pageUtils.showMessage(`Made 100 edits`);
    }

    @action
    async store_fake_data() {
        if (!this.db) {
            this.pageUtils.showError('cant, no db');
        }
        // This gets us the people.
        // NOTE: This sets up default availability. No 'unavailable' tho.
        let people_added = NPBCStoreConstruction.SetupPeople(this.store.people);
        let neil = this.store.people.findByNameFuzzy("Neil Clayton");
        if (neil) {
            if (neil.organization) {
                if (neil.organization.name != "North Porirua Baptist Church") {
                    neil.organization.name = "North Porirua Baptist Church";
                    await this.server.saveOrganization(neil.organization);
                    this.pageUtils.showMessage("Updated org name");
                }
            }
        }

        /*
        Teams need people!
        This sets unavailability
         */
        let teamManager = this.store.teams;
        let defaultTeam = teamManager.firstThisTypeByName("Default", false);
        if (!defaultTeam) {
            defaultTeam = new Team("Default", this.store.people.all);
            teamManager.add(defaultTeam);
            this.pageUtils.showMessage("Added default team");
        }

        NPBCStoreConstruction.SetupTeamUnavailability(defaultTeam);

        for (let person of people_added) {
            // this.logger.info(`Saving: ${person}`);
            await this.server.savePerson(person);
        }

        if (people_added.length > 0) {
            this.pageUtils.showMessage(`${people_added.length} people added`);
        }

        await this.db.async_storeOrUpdateObject(defaultTeam);
        let plan = this.setup_fake_draft_plan(defaultTeam);
        await this.db.async_storeOrUpdateObject(plan);
    }

    @action
    private setup_fake_draft_plan(team: Team): Plan {
        // make up a default team
        // for testing, create some fake
        let plan = this.store.plans.firstThisTypeByName("Sunday Morning Service", false);
        if (plan == null) {
            plan = this.store.plans.add(new Plan("Sunday Morning Service", team));
            this.pageUtils.showMessage('Adding new default plan')
        }
        plan.start_date = csd(2018, 6, 3);
        plan.end_date = csd(2018, 9, 30);

        NPBCStoreConstruction.AttachRolesToPlan(plan);

        try {
            NPBCStoreConstruction.AddPeopleToPlanWithRoles(plan, team);
        } catch (e) {
            // oh oh.
            let ve = ObjectValidation.simple("Cannot setup default fake plan. Is the DB OK? " + e.toString().substr(0, 100));
            this.pageUtils.showValidationError(ve, true);
        }

        return plan;
    }

    fix_our_emails() {
        NPBCStoreConstruction.asyncFixPeoplesEmail(this.store.people, this.http).then(() => {
            this.pageUtils.showMessage(`fix fixy fix done`);
        }, err => this.pageUtils.showError(err, true))
    }

    private static randomAvailability() {
        if (Math.random() > 0.5) {
            return new Availability(Math.round(Math.random() * 4), AvailabilityUnit.EVERY_N_WEEKS)
        } else {
            return new AvailabilityEveryNOfM(Math.round(Math.random() * 3), Math.round(Math.random() * 4));
        }

    }
}
