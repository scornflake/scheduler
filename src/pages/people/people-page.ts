import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {RootStore} from "../../store/root";
import {NamedObject} from "../../scheduling/base-types";
import {PageUtils} from "../page-utils";

@IonicPage({
    name: 'page-people',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-people',
    templateUrl: 'people-page.html'
})
export class PeoplePage {
    @ViewChild('personlist') pc;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public pageUtils: PageUtils,
                public logService: LoggingService
    ) {
        this.logger = logService.getLogger('page.people');
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
        this.rootStore.asyncSaveOrUpdateDb(new_person).then(() => {
            console.log("Added to DB");
        });
    }

    delete_person(person: Person) {
        try {
            this.rootStore.people.remove(person);
        } catch (er) {
            this.pageUtils.showError(er);
        }
    }
}