import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController, NavController} from "ionic-angular";
import {PageUtils} from "../../pages/page-utils";
import {ObjectValidation} from "../../scheduling/shared";
import {NamedObject} from "../../scheduling/base-types";

@Component({
    selector: 'people',
    templateUrl: 'people.html'
})
export class PeopleComponent {

    @Input() people: Array<Person>;
    @Output() delete = new EventEmitter<Person>();
    @Output() person_added = new EventEmitter<Person>();

    name_filter: string = "";

    constructor(private navCtrl: NavController,
                private pageUtils: PageUtils,
                private alertCtrl: AlertController) {
    }

    filtered_people(): Array<Person> {
        let people = NamedObject.sortByName(this.people);
        if (this.name_filter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.name_filter.toLowerCase()) >= 0);
        }
        return people;
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
                try {
                    this.person_added.emit(p)
                } catch (err) {
                    this.pageUtils.show_validation_error(ObjectValidation.simple(err));
                }
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
