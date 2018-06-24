import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";
import {Team} from "../../scheduling/teams";

@IonicPage({
    name: 'page-plans',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-plans',
    templateUrl: 'plans.html',
})
export class PlansPage {
    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public alertCtrl: AlertController,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    get plans() {
        return this.rootStore.plans.all;
    }

    ionViewDidLoad() {
        // for debugging
        if (this.plans.length == 0) {
            // this.navCtrl.pop();
        } else {
            // this.show_plan_detail(this.plans[0])
        }
    }

    add_plan() {
        // Select a team
        let alert = this.alertCtrl.create({
            title: "Select team to use"
        });
        let teams = this.rootStore.teams.all;
        for (let t of NamedObject.sortByName(teams)) {
            alert.addInput({
                type: 'radio',
                value: t.uuid,
                label: t.name
            })
        }
        alert.addButton({
            text: 'Add',
            handler: (uuid) => {
                try {
                    let team = this.rootStore.findByUUID(uuid) as Team;
                    let plan = this.rootStore.createNewPlan('New Plan', team);

                    this.rootStore.asyncSaveOrUpdateDb(plan).then(() => {
                        this.rootStore.plans.add(plan);
                        this.show_plan_detail(plan);
                    });
                } catch(err) {
                    this.pageUtils.showError(err);
                }
            }
        });
        alert.addButton({
            text: 'Cancel',
            role: 'cancel',
            handler: () => {

            }
        });
        alert.present();
    }

    show_plan_detail(plan: Plan) {
        this.navCtrl.push('page-plan-details', {plan: plan})
    }

    duplicate_plan(plan: Plan) {
        let newPlan = this.rootStore.asyncDuplicateExistingPlan('New Plan', plan).then(newPlan => {
            this.rootStore.plans.add(newPlan);
            this.show_plan_detail(newPlan);
            // this.rootStore.async_save_or_update_to_db(newPlan).then(() => {
            // });
        });
    }

    delete_plan(plan: Plan) {
        let alert = this.alertCtrl.create({
            message: "Are you sure?",
            buttons: [
                {
                    text: 'Cancel',
                    handler: () => {
                    }
                },
                {
                    text: 'Delete',
                    role: 'cancel',
                    handler: () => {
                        alert.dismiss().then(() => {
                            try {
                                this.rootStore.plans.remove(plan);
                            } catch (ex) {
                                this.pageUtils.showError(ex);
                            }
                        });
                        return false;
                    },
                }
            ]
        });
        alert.present();
    }
}
