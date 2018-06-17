import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Team} from "../../scheduling/teams";
import {PageUtils} from "../page-utils";

@IonicPage({
    name: 'page-teams',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-teams',
    templateUrl: 'teams.html',
})
export class TeamsPage {

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    ngAfterViewInit() {
        // let the_teams = this.teams();
        // if (the_teams.length > 0) {
        //     this.show_team_detail(the_teams[0]);
        // }
        // this.add_new_team();
    }

    add_new_team() {
        let team = new Team("");
        this.show_team_detail(team, (add: boolean) => {
            if (add) {
                this.rootStore.teams.add(team);
                this.rootStore.asyncSaveOrUpdateDb(team).then(() => {
                    console.log("Added to DB")
                })
            }
        });
    }

    show_team_detail(team, callback = null) {
        this.navCtrl.push('page-team', {team: team, callback: callback})
    }

    teams() {
        return this.rootStore.teams.all;
    }

    delete_team(team: Team) {
        try {
            this.rootStore.teams.remove(team);
        } catch (ex) {
            this.pageUtils.show_error(ex);
        }
    }
}
