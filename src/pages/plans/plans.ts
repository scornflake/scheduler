import {Component, QueryList, ViewChildren} from '@angular/core';
import {AlertController, IonicPage, ItemSliding, NavController, NavParams} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";
import {Team} from "../../scheduling/teams";
import {action, computed} from "mobx-angular";
import * as moment from "moment";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";

@IonicPage({
    name: 'page-plans',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-plans',
    templateUrl: 'plans.html',
})
export class PlansPage {
    @ViewChildren('slidersRef') sliders: QueryList<ItemSliding>;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public alertCtrl: AlertController,
                public access: AccessControlProvider,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }

    @computed get plans() {
        return this.rootStore.plans.all.sort();
    }

    get canManage() {
        return this.access.canUpdateAny(ResourceType.Plan);
    }

    ionViewDidLoad() {
        // for debugging, pop to first page if no plans
        // if (this.plans.length == 0) {
        //     this.navCtrl.pop();
        // } else {
        //     // For Debug, show first plan
        //     if (this.plans.length) {
        //         this.showPlanDetail(this.plans[0])
        //     }
        // }
    }

    @action addPlan() {
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
                        this.showPlanDetail(plan);
                    });
                } catch (err) {
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

    showPlanDetail(plan: Plan) {
        this.navCtrl.push('page-plan-details', {plan: plan})
    }

    duplicatePlan(plan: Plan, index: number) {
        let slidersList = this.sliders.toArray();
        let selectedSlider = slidersList[index];
        let newPlanName = Plan.newPlanName(plan.name);
        this.rootStore.asyncDuplicateExistingPlan(newPlanName, plan).then(newPlan => {
            // let existingDuration = plan.schedule_duration_in_days;

            // Make the start equal to the next avail date
            newPlan.setStartDate(moment(plan.end_date).add(plan.days_per_period + 1, 'day').toDate());
            newPlan.setEndDate(moment(newPlan.start_date).add(3, 'month').subtract(1, 'day').toDate());

            this.showPlanDetail(newPlan);
            selectedSlider.close();
        });
    }

    deletePlan(plan: Plan) {
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
                                this.pageUtils.showMessage(`Plan "${plan.name}" deleted`);
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
