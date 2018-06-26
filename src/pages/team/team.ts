import {Component, ViewChild} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';
import {Team} from "../../scheduling/teams";
import {Person} from "../../scheduling/people";
import {RootStore} from "../../store/root";
import {ObjectValidation} from "../../scheduling/shared";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";

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
                public pageUtils: PageUtils,
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
        try {
            this.callback(true);
        } catch (err) {
            this.pageUtils.show_validation_error(ObjectValidation.simple(err));
        }
        this.navCtrl.pop();
    }

    get okButtonDisabled(): boolean {
        if(!this.team) {
            return true;
        }
        if(!this.team.name) {
            return true;
        }
        if(this.team.name.length == 0) {
            return true;
        }
        return false;
    }

    add_person_to_team(person: Person) {
        this.rootStore.asyncSaveOrUpdateDb(person).then((new_person) => {
            this.rootStore.people.add(person);
            this.team.add(person);
        });
    }

    delete_from_team(person: Person) {
        this.team.remove(person);
    }

    add_from_existing() {
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select people to add"
        });
        let people_not_in_list = this.rootStore.people.all.filter(p => this.team.findPersonInTeam(p) == null);
        if (people_not_in_list.length == 0) {
            let validation = ObjectValidation.simple("All people are already in the list");
            this.pageUtils.show_validation_error(validation);
            return;
        }
        for (let p of NamedObject.sortByName(people_not_in_list)) {
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
                    let person = this.rootStore.findByUUID(uuid) as Person;
                    this.team.add(person);
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
}

