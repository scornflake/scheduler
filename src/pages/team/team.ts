import {ChangeDetectorRef, Component, NgZone, ViewChild} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';
import {Team} from "../../scheduling/teams";
import {Person} from "../../scheduling/people";
import {RootStore} from "../../store/root";
import {ObjectValidation} from "../../scheduling/shared";
import {PageUtils} from "../page-utils";
import {NamedObject} from "../../scheduling/base-types";
import {Logger, LoggingService} from "ionic-logging-service";

@IonicPage({
    name: 'page-team',
    defaultHistory: ['page-teams', 'home']
})
@Component({
    selector: 'page-team',
    templateUrl: 'team.html',
})
export class TeamPage {
    team: Team;
    callback: (add: boolean) => void;
    @ViewChild('peoplelist') pc;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public viewCtrl: ViewController,
                public pageUtils: PageUtils,
                public alertCtrl: AlertController,
                public cd: ChangeDetectorRef,
                private logService: LoggingService,
                public zone: NgZone,
                public rootStore: RootStore,
                public navParams: NavParams) {
        this.team = navParams.get('team');
        this.callback = navParams.get('callback');
        this.logger = this.logService.getLogger('page.team')
    }

    // ngDoCheck() {
    //     console.warn(`TeamPage is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`TeamPage has changes`)
    // }

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
        } else {
        }
    }

    send_cancel() {
        this.callback(false);
        this.navCtrl.pop();
    }

    send_ok() {
        this.navCtrl.pop().then(() => {
            try {
                this.callback(true);
            } catch (err) {
                this.pageUtils.showValidationError(ObjectValidation.simple(err));
            }
        });
    }

    get okButtonDisabled(): boolean {
        if (!this.team) {
            return true;
        }
        if (!this.team.name) {
            return true;
        }
        if (this.team.name.length == 0) {
            return true;
        }
        return false;
    }

    add_person_to_team(person: Person) {
        this.team.add(person);
        this.rootStore.asyncSaveOrUpdateDb(this.team);
    }

    delete_from_team(person: Person) {
        this.team.remove(person);

    }

    addFromExisting() {
        // Show a selection of people, with add/cancel button
        let alert = this.alertCtrl.create({
            title: "Select people to add"
        });
        let people_not_in_list = this.rootStore.people.all.filter(p => this.team.findPersonInTeam(p) == null);
        if (people_not_in_list.length == 0) {
            let validation = ObjectValidation.simple("All people are already in the list");
            this.pageUtils.showValidationError(validation);
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
                let dismissTransition = alert.dismiss();
                dismissTransition.then(() => {
                    this.addExistingUUIDsToTeam(uuids)
                });
                // this.addExistingUUIDsToTeam(uuids);
                // return true;
                return false;
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

    addExistingUUIDsToTeam(uuids) {
        for (let uuid of uuids) {
            let person = this.rootStore.findByUUID(uuid) as Person;
            this.team.add(person);

            // For some reason, the change to the data isn't enough
            this.cd.detectChanges();
            this.logger.info(`Added ${uuid} to team`);
        }
    }
}

