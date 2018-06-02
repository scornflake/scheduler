import {Component, ViewChild} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams, ToastController, ViewController} from 'ionic-angular';
import {Team} from "../../scheduling/teams";
import {Person} from "../../scheduling/people";
import {GenericListOfThingsPage} from "../generic-list-of-things/generic-list-of-things";
import {RootStore} from "../../store/root";
import {ObjectValidation} from "../../scheduling/shared";

@IonicPage({
    name: 'page-team',
    defaultHistory: ['page-teams']
})
@Component({
    selector: 'page-team',
    templateUrl: 'team.html',
})
export class TeamPage {
    team: Team;
    callback: (add: boolean) => void;
    @ViewChild('peoplelist') pc;

    constructor(public navCtrl: NavController,
                public viewCtrl: ViewController,
                public toastController: ToastController,
                public alertCtrl: AlertController,
                public rootStore: RootStore,
                public navParams: NavParams) {
        this.team = navParams.get('team');
        this.callback = navParams.get('callback');
    }

    get has_add_button() {
        return this.callback != null;
    }

    ionViewDidLoad() {
        if (this.has_add_button) {
            this.viewCtrl.showBackButton(false);
        }
        if (!this.team) {
            // No team? go back to the teams list
            this.navCtrl.pop();
        }
    }

    send_cancel() {
        this.callback(false);
        this.navCtrl.pop();
    }

    send_ok() {
        this.callback(true);
        this.navCtrl.pop();
    }

    add_person_to_team(person: Person) {
        this.team.add_person(person);

        // TODO: Add to all people?
    }

    delete_from_team(person: Person) {
        this.team.remove_person(person);
    }

    add_from_existing() {
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select people to add"
        });
        let people_not_in_list = this.rootStore.people_store.people.filter(p => this.team.find_person_in_team(p) == null);
        if (people_not_in_list.length == 0) {
            this.show_validation_error(ObjectValidation.simple("All people are already in the list"));
            return;
        }
        for (let p of Person.sort_by_name(people_not_in_list)) {
            alert.addInput({
                type: 'checkbox',
                value: p.uuid,
                label: p.name
            })
        }
        alert.addButton({
            text: 'Add',
            handler: (uuids) => {
                for (let uuid of uuids) {
                    let person = this.rootStore.people_store.find_by_uuid(uuid);
                    this.team.add_person(person);
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

    private show_validation_error(validation: ObjectValidation) {
        let t = this.toastController.create({
            message: validation.errors.join(", "),
            duration: 3000,
            cssClass: 'validation'
        });
        t.present();
    }
}

