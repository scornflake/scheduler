import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController, NavController} from "ionic-angular";

@Component({
    selector: 'people',
    templateUrl: 'people.html'
})
export class PeopleComponent {

    @Input() people: Array<Person>;
    @Output() delete = new EventEmitter<Person>();
    @Output() person_added = new EventEmitter<Person>();

    constructor(private navCtrl: NavController, private alertCtrl: AlertController) {
    }

    public show_person_detail(person: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: person})
    }

    public add_new_person() {
        let new_object = new Person();
        new_object.name = "";
        this.navCtrl.push('PersonDetailsPage', {
            person: new_object,
            is_create: true,
            callback: (p: Person) => {
                this.person_added.emit(p)
            }
        })
    }

    delete_person(person: Person) {
        let alert = this.alertCtrl.create({
            message: "Are you sure?",
            buttons: [
                {
                    text: 'Cancel',
                    handler: () => {
                    }
                },
                {
                    text: 'Delete',
                    role: 'cancel',
                    handler: () => {
                        alert.dismiss().then(() => {
                            this.delete.emit(person);
                        });
                        return false;
                    },
                }
            ]
        });
        alert.present()
    }
}
