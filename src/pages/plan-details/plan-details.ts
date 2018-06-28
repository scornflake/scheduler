import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {Plan} from "../../scheduling/plan";
import {dateForISODateString} from "../../scheduling/common/date-utils";
import {Person} from "../../scheduling/people";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";
import {action, computed} from "mobx-angular";

@IonicPage({
    name: 'page-plan-details',
    defaultHistory: ['page-plans', 'home']
})
@Component({
    selector: 'page-plan-details',
    templateUrl: 'plan-details.html',
})
export class PlanDetailsPage {
    plan: Plan;

    constructor(public navCtrl: NavController,
                public alertCtrl: AlertController,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
        this.plan = this.navParams.get('plan');
    }

    @computed get sorted_people(): Array<Person> {
        return NamedObject.sortByName(this.plan.people);
    }

    description_for_person(p: Person) {
        let items: Array<any> = [p.availability];
        items = items.concat(this.plan.get_assignment_for(p).roles);
        return items.join(", ");
    }

    ionViewDidLoad() {
        if (this.plan == null) {
            this.navCtrl.pop();
        } else {
            // for debugging
            // this.show_assignment(this.plan.people[0]);
        }
    }

    @action add_assignment() {
        // Choose a person
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select people to add"
        });
        let team = this.plan.team;
        let people_not_in_plan = team.people.filter(p => this.plan.get_assignment_for(p) == null);
        if (people_not_in_plan.length == 0) {
            this.pageUtils.showMessage("All people are already in the list");
            return;
        }
        for (let p of NamedObject.sortByName(people_not_in_plan)) {
            alert.addInput({
                type: 'checkbox',
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
            handler: (uuids) => {
                for (let uuid of uuids) {
                    let person = team.findPersonByUUID(uuid);
                    this.plan.assignmentFor(person);
                }

                // If just single person added, can edit this directly
                if (uuids.length == 1) {
                    // Kick off UI with this
                    let person = team.findPersonByUUID(uuids[0]);
                    this.show_assignment(person);
                }
            }
        });
        alert.present();
    }

    @action delete_assignment_for_person(person) {
        this.plan.remove_person(person);
    }

    show_assignment(person) {
        let assignment = this.plan.get_or_create_assignment_for(person);
        if (assignment) {
            console.log(`Showing assignment for ${assignment.person.name} and plan ${this.plan.name}`);
            this.navCtrl.push('page-person-assignment', {
                plan: this.plan,
                person: person
            })
        }
    }
}
