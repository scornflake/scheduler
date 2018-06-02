import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams, PopoverController, ToastController, ViewController} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {Logger, LoggingService} from "ionic-logging-service";
import {ObjectValidation} from "../../scheduling/shared";

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
                public toastController: ToastController,
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


    show_availability_popup() {
        let popover = this.popoverCtrl.create('AvailabilityOptionsPage', {
            'person': this.person,
            'availability': this.person.availability,
        });
        popover.present({})
    }

    cancel_editing() {
        this.navCtrl.pop();
    }

    ok_editing() {
        let validation = this.person.validate();
        if (!validation.ok) {
            this.show_validation_error(validation);
            return;
        }
        if (this.callback) {
            this.callback(this.person);
        }
        this.navCtrl.pop();
    }


    private show_validation_error(validation: ObjectValidation) {
        let t = this.toastController.create({
            message: validation.errors.join(", "),
            duration: 3000,
            cssClass: 'validation'
        });
        t.present();
    }
}
