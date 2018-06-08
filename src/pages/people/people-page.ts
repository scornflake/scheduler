import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {RootStore} from "../../store/root";

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
        let people = Person.sort_by_name(this.rootStore.people_store.people);
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
        this.rootStore.people_store.add_person(new_person);
        this.rootStore.save_or_update(new_person);
    }

    delete_person(person: Person) {
        this.rootStore.people_store.remove_person(person);
        this.rootStore.remove_object(person);
    }
}