import {ApplicationRef, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Team} from "../../scheduling/teams";
import {PageUtils} from "../page-utils";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {Logger, LoggingService} from "ionic-logging-service";
import {action, computed} from "mobx-angular";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";

@IonicPage({
    name: 'page-teams',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-teams',
    templateUrl: 'teams.html',
})
export class TeamsPage {
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public appRef: ApplicationRef,
                public server: SchedulerServer,
                public access: AccessControlProvider,
                private logService: LoggingService,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.logger = this.logService.getLogger('page.teams');
    }

    ngAfterViewInit() {
        // // For Debug (if not loaded, jump back home)
        // if (!this.teams.length) {
        //     this.navCtrl.pop();
        // }
        // // For Debug, show first team, if we have one
        // let the_teams = this.teams;
        // if (the_teams.length > 0) {
        //     this.showTeamDetail(the_teams[0]);
        // }
    }

    get canManage() {
        // Can edit if this person == logged in person
        return this.access.canUpdateAny(ResourceType.Team);
    }

    @action add_new_team() {
        let team = new Team("");
        this.showTeamDetail(team, (add: boolean) => {
            if (add) {
                this.rootStore.teams.add(team);
                this.rootStore.asyncSaveOrUpdateDb(team).then(() => {
                    this.pageUtils.showMessage('New team added');
                    this.logger.info(`New team added`);
                })
            }
        });
    }

    showTeamDetail(team, callback = null) {
        this.navCtrl.push('page-team', {team: team, callback: callback})
    }

    @computed get teams() {
        return this.rootStore.teams.all;
    }

    @action deleteTeam(team: Team) {
        try {
            // this does rev integrity, and also deletes from the DB
            this.rootStore.teams.remove(team);
            setTimeout(() => {
                this.appRef.tick();
            }, 150)
        } catch (ex) {
            this.pageUtils.showError(ex);
        }
    }
}
