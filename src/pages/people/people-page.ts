import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {RootStore} from "../../store/root";
import {NamedObject} from "../../scheduling/base-types";

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
                public rootStore: RootStore,
                public logService: LoggingService
    ) {
        this.logger = logService.getLogger('page.people');
    }

    public people(): Array<Person> {
        let people = NamedObject.sortByName(this.rootStore.people.all);
        if (this.name_filter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.name_filter.toLowerCase()) >= 0);
        }
        return people;
    }

    public show_person_detail(person: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: person})
    }

    ngAfterViewInit() {
        // for debug
        // this.add_new_person();
        // this.show_person_detail(this.rootStore.people_store.find_person_with_name("Stuart Campbell"));
    }

    private add_person(new_person: Person) {
        this.rootStore.people.add(new_person);
        this.rootStore.async_save_or_update_to_db(new_person).then(() => {
            console.log("Added to DB");
        });
    }

    delete_person(person: Person) {
        this.rootStore.people.remove(person);
        this.rootStore.async_remove_object_from_db(person).then(() => {
            console.log("Removed from DB");
        })
    }
}