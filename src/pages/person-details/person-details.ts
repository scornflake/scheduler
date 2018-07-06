import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams, PopoverController, ViewController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {PageUtils} from "../page-utils";

@IonicPage()
@Component({
    selector: 'page-person-details',
    templateUrl: 'person-details.html',
})
export class PersonDetailsPage {
    person: Person;
    is_create: boolean = false;
    callback: (p: Person) => void = null;
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public navParams: NavParams,
                public viewCtrl: ViewController,
                public pageUtils: PageUtils,
                public popoverCtrl: PopoverController,
                private loggingService: LoggingService) {
        this.person = this.navParams.get('person');
        this.logger = this.loggingService.getLogger("home");

        this.is_create = this.navParams.get('is_create');
        this.callback = this.navParams.get('callback');
    }

    ionViewDidLoad() {
        if (!this.person) {
            this.logger.info("Pushing back to root because there is no person defined");
            this.navCtrl.goToRoot({});
        } else {
        }
        if (this.is_create) {
            this.viewCtrl.showBackButton(false);
        }
    }

    cancel_editing() {
        this.navCtrl.pop();
    }

    ok_editing() {
        let validation = this.person.validate();
        if (!validation.ok) {
            this.pageUtils.showValidationError(validation);
            return;
        }
        this.navCtrl.pop().then(() => {
            if (this.callback) {
                this.callback(this.person);
            }
        });
    }
}
