import {ChangeDetectionStrategy, Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Team} from "../../scheduling/teams";
import {PageUtils} from "../page-utils";
import {computed} from "mobx-angular";

@IonicPage({
    name: 'page-teams',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-teams',
    templateUrl: 'teams.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsPage {

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    ngAfterViewInit() {
        // For Debug (if not loaded, jump back home)
        // if(!this.teams.length) {
        //     this.navCtrl.pop();
        // }

        // For Debug, show first team, if we have one
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

    add_new_team() {
        let team = new Team("");
        this.showTeamDetail(team, (add: boolean) => {
            if (add) {
                this.rootStore.teams.add(team);
                this.rootStore.asyncSaveOrUpdateDb(team).then(() => {
                    this.pageUtils.showMessage('New team added');
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

    delete_team(team: Team) {
        try {
            this.rootStore.teams.remove(team);
        } catch (ex) {
            this.pageUtils.showError(ex);
        }
    }
}
