import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NavController} from "ionic-angular";
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";

@Component({
    selector: 'person-details',
    templateUrl: 'person-details.html'
})
export class PersonDetailsComponent {
    @Input() person: Person;

    @Output() show_availability = new EventEmitter();

    constructor(public navCtrl: NavController,
                public rootStore: RootStore) {
    }

    ngOnInit() {
        // for debugging
        if (this.person != null) {
            // this.role_tapped(this.person.roles[0]);
            // this.add_if_in_role_rule();
            // this.add_try_to_be_on_with_rule();
        }
    }
}