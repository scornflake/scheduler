import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController, NavController, PopoverController, ViewController} from "ionic-angular";
import {RootStore} from "../../store/root";
import {Role} from "../../scheduling/role";
import {ScheduleOn, TryToScheduleWith} from "../../scheduling/rule_based/rules";
import {Availability, AvailabilityUnit} from "../../scheduling/availability";

@Component({
    selector: 'person-details',
    templateUrl: 'person-details.html'
})
export class PersonDetailsComponent {
    @Input() person: Person;

    @Output() show_availability = new EventEmitter();
    private active: ViewController;

    constructor(public alertCtrl: AlertController,
                public navCtrl: NavController,
                public popoverCtrl: PopoverController,
                public rootStore: RootStore) {
    }

    ngOnInit() {
        // for debugging
        if (this.person != null) {
            // this.role_tapped(this.person.roles[0]);
            // this.add_if_in_role_rule();

            this.add_try_to_be_on_with_rule();
        }
    }

    add_roles_to_alert(alert, input_type = 'checkbox', handler = (r) => {
    }) {
        let all_roles = this.rootStore.roles_store.roles;
        for (let r of all_roles) {
            if (input_type == 'button') {
                alert.addButton({
                    text: r.name,
                    handler: handler(r)
                })
            } else {
                alert.addInput({
                    type: input_type,
                    label: r.name,
                    value: r.uuid
                })
            }
        }
    }

    add_cancel_to_alert(alert, handler = () => {
    }) {
        alert.addButton({
            text: 'Cancel',
            role: 'cancel',
            handler: handler
        });
    }

    add_new_role() {
        // Show a list of possible roles
        let alert = this.alertCtrl.create({});
        this.add_roles_to_alert(alert, 'checkbox');
        this.add_cancel_to_alert(alert);

        alert.addButton({
            text: 'Add',
            handler: data => {
                // We receive an array of 'values'
                for (let role_id of data) {
                    let role_to_add = this.rootStore.roles_store.find_by_uuid(role_id);
                    if (role_to_add) {
                        this.person.add_role(role_to_add);
                    }
                }
                console.log(`selected: ${JSON.stringify(data)}`)
            }
        });

        alert.setTitle('Choose roles to add');
        alert.present()
    }

    role_tapped(role: Role) {
        this.navCtrl.push('RoleDetailPage', {
            'person': this.person,
            'role': role
        });
    }

    add_new_rule() {
        let alert = this.alertCtrl.create({});
        this.active = this.navCtrl.getActive();

        /*
        Rule types
         */
        alert.addButton({
            'text': 'If in role...',
            handler: () => {
                this.add_if_in_role_rule()
            }
        });
        alert.addButton({
            'text': "I'd like to be on with...",
            handler: () => {
                this.add_try_to_be_on_with_rule()
            }
        });

        this.add_cancel_to_alert(alert);

        alert.setTitle('Choose role to add');
        alert.present()
    }

    private add_if_in_role_rule() {
        let list_of_things = this.rootStore.roles_store.roles;
        this.navCtrl.push('list-of-things', {
            things: list_of_things,
            'title': 'When in role...',
            'item-pressed': (item) => {
                this.continue_add_in_role(item);
            },
            'show-push': true
        });
    }

    private add_try_to_be_on_with_rule() {
        let popover = this.popoverCtrl.create('TryToScheduleWithOtherPage', {
            'callback': (person, distance, max) => {
                let availability = new Availability(distance, AvailabilityUnit.EVERY_N_WEEKS);
                let schedule = new TryToScheduleWith(person, availability, max);
                this.person.add_secondary_action(schedule);
            }
        }, {
            cssClass: 'try-popover'
        });
        popover.present();
    }

    private continue_add_in_role(if_in_this_role: Role) {
        let roles = this.rootStore.roles_store.roles;
        this.navCtrl.push('list-of-things', {
            things: roles,
            'title': 'Also be in role...',
            'label-callback': (t) => {
                t.toString()
            },
            'item-pressed': (item: Role) => {
                // DO IT
                if (this.active) {
                    this.navCtrl.popTo(this.active);

                    let new_role = new ScheduleOn(this.person, item);
                    this.person.if_assigned_to(if_in_this_role).then(new_role)
                }
            },
            'show-push': true
        });
    }
}
