import {Component, ViewChild} from '@angular/core';
import {AlertController, IonicPage, NavController} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";

@IonicPage({
    name: 'page-people',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-people',
    templateUrl: 'people-page.html'
})
export class PeoplePage {
    name_filter: string = "";
    @ViewChild('personlist') pc;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public logService: LoggingService,
                public alertCtrl: AlertController,
                public rootStore: RootStore) {
        this.logger = logService.getLogger('page.people');
    }

    public people(): Array<Person> {
        let people = Person.sort_by_name(this.rootStore.people_store.people);
        if (this.name_filter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.name_filter.toLowerCase()) >= 0);
        }
        return people;
    }

    private add_person(new_person: Person) {
        this.logger.info(`Guess I should add: ${new_person}`);
        this.rootStore.people_store.add_person(new_person);
    }

    public show_person_detail(person: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: person})
    }

    ngAfterViewInit() {
        // for debug
        // this.add_new_person();
        // this.show_person_detail(this.rootStore.people_store.find_person_with_name("Stuart Campbell"));
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