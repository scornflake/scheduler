import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NavController} from "ionic-angular";
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";
import {observable} from "mobx-angular";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";

@Component({
    selector: 'person-details',
    templateUrl: 'person-details.html',
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonDetailsComponent {
    @observable @Input() person: Person;
    @Input() availabilityTitle: string = "Availability";
    @Output() show_availability = new EventEmitter();

    constructor(public navCtrl: NavController,
                public access: AccessControlProvider,
                public rootStore: RootStore) {
    }

    get canEdit() {
        // Can edit if this person == logged in person
        let ownResource = this.rootStore.loggedInPerson.uuid == this.person.uuid;
        return ownResource ? this.access.canUpdateOwn(ResourceType.People) : this.access.canUpdateAny(ResourceType.People);
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
