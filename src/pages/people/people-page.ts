import {ChangeDetectionStrategy, Component, ViewChild} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {SWBSafeJSON} from "../../common/json/safe-stringify";

@IonicPage({
    name: 'page-people',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-people',
    templateUrl: 'people-page.html',
    // changeDetection: ChangeDetectionStrategy.OnPush
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

    // ngDoCheck() {
    //     console.warn(`PeoplePage is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`PeoplePage has changes`)
    // }

    ngAfterViewInit() {
        if (!this.rootStore.people.length) {
            this.navCtrl.pop();
        }
        // for debug
        // this.add_new_person();
        // this.show_person_detail(this.rootStore.people_store.find_person_with_name("Stuart Campbell"));
    }

    add_person(new_person: Person) {
        console.log(`Adding new_person ${new_person} to rootstore/people`);
        this.rootStore.people.add(new_person);
        console.log(`Added new_person ${new_person} to rootstore/people`);
        this.rootStore.asyncSaveOrUpdateDb(new_person).then(() => {
            this.logger.info("Added to DB");
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