import {ChangeDetectionStrategy, Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams, PopoverController, ViewController} from 'ionic-angular';
import {Assignment} from "../../scheduling/assignment";
import {ScheduleOn, TryToScheduleWith} from "../../scheduling/rule_based/rules";
import {Availability, AvailabilityUnit} from "../../scheduling/availability";
import {Person} from "../../scheduling/people";
import {RootStore} from "../../store/root";
import {Role} from "../../scheduling/role";
import {Plan} from "../../scheduling/plan";
import {computed, observable} from "mobx-angular";
import {ResourceType} from "../../providers/access-control/access-control";
import {PageUtils} from "../page-utils";
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";

@IonicPage({
    name: 'page-person-assignment',
    defaultHistory: ['page-plan-details', "home"]
})
@Component({
    selector: 'page-person-assignment',
    templateUrl: 'person-assignment.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonAssignmentPage {
    @observable person: Person;
    @observable plan: Plan;
    private active: ViewController;

    constructor(public navCtrl: NavController,
                public rootStore: RootStore,
                public alertCtrl: AlertController,
                public pageUtils: PageUtils,
                public popoverCtrl: PopoverController,
                public navParams: NavParams) {

        this.plan = navParams.get('plan');
        this.person = navParams.get('person');
    }

    @computed get assignment(): Assignment {
        if (this.plan && this.person) {
            return this.plan.assignmentFor(this.person);
        }
        return null;
    }

    get canEditPerson(): boolean {
        return this.pageUtils.canEdit(ResourceType.People, this.person.uuid == this.rootStore.loggedInPerson.uuid);
    }

    get canManagePlan(): boolean {
        return this.pageUtils.canManage(ResourceType.Plan);
    }

    ionViewDidLoad() {
        if (this.assignment == null) {
            this.navCtrl.pop();
        } else {
            // // For debugging
            // if (this.assignment.roles.length > 0) {
            //     this.role_tapped(this.assignment.roles[0]);
            // }
        }
    }

    @computed get person_name_details(): string {
        if (this.person) {
            let list = [];
            if (this.person.name) {
                list.push(this.person.name);
            }
            if (this.person.email) {
                list.push(this.person.email)
            }
            return list.join(", ")
        }
        return "";
    }


    add_roles_to_alert(alert, input_type = 'checkbox', handler = (r) => {
    }) {
        let all_roles = this.plan.roles.sort();
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
                    let role_to_add = this.plan.find_role_by_uuid(role_id);
                    if (role_to_add) {
                        this.assignment.addRole(role_to_add);
                    }
                }
                console.log(`selected: ${JSON.stringify(data)}`)
            }
        });

        alert.setTitle('Choose roles to add');
        alert.present()
    }

    role_tapped(role: Role) {
        this.navCtrl.push('page-role-plan-assignment', {
            'assignment': this.assignment,
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

        alert.setTitle('Choose rule to add');
        alert.present()
    }

    private add_if_in_role_rule() {
        let list_of_things = this.plan.roles;
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
            'people': this.plan.team.people,
            'callback': (person, distance, max) => {
                let availability = new Availability(distance, AvailabilityUnit.EVERY_N_WEEKS);
                let schedule = new TryToScheduleWith(person, availability, max);
                this.assignment.add_secondary_action(schedule);
            }
        }, {
            cssClass: 'try-popover'
        });
        popover.present();
    }

    private continue_add_in_role(if_in_this_role: Role) {
        let roles = this.plan.roles;
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
                    this.assignment.if_assigned_to(if_in_this_role).thenDo(new_role)
                }
            },
            'show-push': true
        });
    }
}
