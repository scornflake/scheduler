import {ApplicationRef, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Team} from "../../scheduling/teams";
import {PageUtils} from "../page-utils";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {action, computed} from "mobx-angular";

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
                public appRef:ApplicationRef,
                public server: SchedulerServer,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.logger = LoggingWrapper.getLogger('page.teams');
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

    // ngDoCheck() {
    //     console.warn(`TeamsPage is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`TeamsPage has changes`)
    // }

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
