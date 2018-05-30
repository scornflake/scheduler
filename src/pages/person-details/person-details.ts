import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams, PopoverController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {AvailabilityOptionsPage} from "../availability-options/availability-options";

@IonicPage()
@Component({
    selector: 'page-person-details',
    templateUrl: 'person-details.html',
})
export class PersonDetailsPage {
    person: Person;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                public popoverCtrl: PopoverController,
                private loggingService: LoggingService) {
        this.person = this.navParams.get('person');
        this.logger = this.loggingService.getLogger("home");
    }

    ionViewDidLoad() {
        if (!this.person) {
            this.logger.info("Pushing back to root because there is no person defined");
            this.navCtrl.goToRoot({});
        } else {
        }
    }


    show_availability_popup() {
        let popover = this.popoverCtrl.create('AvailabilityOptionsPage', {
            'person': this.person,
            'availability': this.person.availability,
        });
        popover.present({})
    }
}
