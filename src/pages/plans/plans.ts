import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {RootStore} from "../../store/root";

@IonicPage({
    name: 'page-plans',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-plans',
    templateUrl: 'plans.html',
})
export class PlansPage {
    private plans: Array<Plan>;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public navParams: NavParams) {
        this.plans = this.rootStore.plans.all;
    }

    ionViewDidLoad() {
        // for debugging
        // this.show_plan_detail(this.plans[0])
    }

    add_plan() {

    }

    show_plan_detail(plan: Plan) {
        this.navCtrl.push('page-plan-details', {plan: plan})
    }

    delete_plan(plan: Plan) {

    }
}
