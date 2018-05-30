import {Component} from '@angular/core';
import {AlertController, NavController} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";

@Component({
    selector: 'page-people',
    templateUrl: 'people.html'
})
export class PeoplePage {
    name_filter: string = "";
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public logService: LoggingService,
                public alertCtrl: AlertController,
                public rootStore: RootStore) {
        this.logger = logService.getLogger('page.people');
    }

    public people(): Array<Person> {
        let people = this.rootStore.people_store.people.sort((a, b) => {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        });
        if (this.name_filter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.name_filter.toLowerCase()) >= 0);
        }
        return people;
    }

    public add_new_person() {
        let p = new Person();
        p.name = "";
        this.navCtrl.push('PersonDetailsPage', {person: p, is_create: true, callback: this.add_person.bind(this)})
    }

    private add_person(new_person: Person) {
        this.logger.info(`Guess I should add: ${new_person}`);
        this.rootStore.people_store.add_person(new_person);
    }

    public show_person_detail(p: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: p})
    }

    ngAfterViewInit() {
        // for debug
        // this.add_new_person();
        // this.show_person_detail(this.people()[0]);
    }

    delete_person(person: Person) {
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
                            this.rootStore.people_store.remove_person(person);
                        });
                        return false;
                    },
                }
            ]
        });
        alert.present()
    }
}