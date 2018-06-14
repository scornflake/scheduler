import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {dateForISODateString} from "../../scheduling/common/date-utils";
import {Person} from "../../scheduling/people";
import {ObjectValidation} from "../../scheduling/shared";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";

@IonicPage({
    name: 'page-plan-details',
    defaultHistory: ['page-plans', 'home']
})
@Component({
    selector: 'page-plan-details',
    templateUrl: 'plan-details.html',
})
export class PlanDetailsPage {
    private plan: Plan;

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.plan = this.navParams.get('plan');
    }

    get sorted_people(): Array<Person> {
        return NamedObject.sortByName(this.plan.people);
    }

    ionViewDidLoad() {
        if (this.plan == null) {
            this.navCtrl.pop();
        } else {
            // for debugging
            // this.show_assignment(this.plan.people[0]);
        }
    }

    set_end_date($event) {
        this.plan.end_date = dateForISODateString($event);

    }

    set_start_date($event) {
        this.plan.start_date = dateForISODateString($event);
    }

    add_assignment() {
        // Choose a person
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select person to add"
        });
        let team = this.plan.team;
        let people_not_in_plan = team.people.filter(p => this.plan.get_assignment_for(p) == null);
        if (people_not_in_plan.length == 0) {
            this.pageUtils.show_message("All people are already in the list");
            return;
        }
        for (let p of NamedObject.sortByName(people_not_in_plan)) {
            alert.addInput({
                type: 'radio',
                value: p.uuid,
                label: p.name
            })
        }
        alert.addButton({
            text: 'Cancel',
            role: 'cancel',
            handler: () => {

            }
        });
        alert.addButton({
            text: 'Add',
            handler: (uuid) => {
                let person = team.findPersonByUUID(uuid);
                // Kick off UI with this
                this.show_assignment(person);
            }
        });
        alert.present();
    }

    delete_assignment_for_person(person) {
        this.plan.remove_person(person);
    }

    show_assignment(person) {
        let assignment = this.plan.get_or_create_assignment_for(person);
        if (assignment) {
            this.navCtrl.push('page-person-assignment', {
                assignment: assignment
            })
        }
    }
}
