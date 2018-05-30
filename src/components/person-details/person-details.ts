import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController} from "ionic-angular";
import {RootStore} from "../../store/root";
import {Role} from "../../scheduling/role";

@Component({
    selector: 'person-details',
    templateUrl: 'person-details.html'
})
export class PersonDetailsComponent {
    @Input() person: Person;

    @Output() show_availability = new EventEmitter();

    constructor(public alertCtrl: AlertController, public rootStore: RootStore) {
    }

    add_new_role() {
        // Show a list of possible roles
        let options = {};
        let all_roles = this.rootStore.roles_store.roles;
        let alert = this.alertCtrl.create(options);
        for (let r of all_roles) {
            alert.addInput({
                type: 'checkbox',
                label: r.name,
                value: r.uuid
            })
        }

        alert.addButton({
            text: 'Cancel',
            role: 'cancel',
            handler: () => {

            }
        });

        alert.addButton({
            text: 'Add',
            handler: data => {
                // We receive an array of 'values'
                for(let role_id of data) {
                    let role_to_add = this.rootStore.roles_store.find_by_uuid(role_id);
                    if(role_to_add) {
                        this.person.add_role(role_to_add);
                    }
                }
                console.log(`selected: ${JSON.stringify(data)}`)
            }
        });

        alert.setTitle('Choose roles to add');
        alert.present()
    }
}
