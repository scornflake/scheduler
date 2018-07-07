import {ChangeDetectorRef, Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController, NavController} from "ionic-angular";
import {PageUtils} from "../../pages/page-utils";
import {ObjectValidation} from "../../scheduling/shared";
import {NamedObject} from "../../scheduling/base-types";
import {action, computed, observable} from "mobx-angular";
import {RootStore} from "../../store/root";

@Component({
    selector: 'people',
    templateUrl: 'people.html',
})
export class PeopleComponent {
    @Input() people: Array<Person>;
    @Output() delete = new EventEmitter<Person>();
    @Output() personAdded = new EventEmitter<Person>();

    @observable nameFilter: string = "";

    constructor(private navCtrl: NavController,
                private pageUtils: PageUtils,
                public cd: ChangeDetectorRef,
                private store: RootStore,
                private alertCtrl: AlertController) {
    }

    @computed get filteredPeople(): Array<Person> {
        let people = NamedObject.sortByName(this.people);
        if (this.nameFilter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0);
        }
        // console.warn(`PeopleComponent returning filtered people to template, ${people.map(p => p.name).join(", ")}`);
        return people;
    }

    // ngDoCheck() {
    //     console.warn(`PeopleComponent is being checked`);
    // }
    //
    // ngOnChanges(changes) {
    //     console.warn(`PeopleComponent has changes`)
    // }

    public showPersonDetail(person: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: person})
    }

    personSummary(person: Person, showTeams: boolean = false): string {
        let things: Array<any> = [person.availability];
        if(showTeams) {
            let inTeams = this.store.teams.findAllWithPerson(person);
            if (inTeams.length) {
                let listOfTeams = inTeams.map(t => t.name).join(", ");
                things.push(`in teams: ${listOfTeams}`);
            }
        }
        return things.join(", ");
    }

    public addNewPerson() {
        let new_object = new Person('');
        this.navCtrl.push('PersonDetailsPage', {
            person: new_object,
            is_create: true,
            callback: (p: Person) => {
                try {
                    this.personAdded.emit(p)
                } catch (err) {
                    this.pageUtils.showValidationError(ObjectValidation.simple(err));
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
                        try {
                            this.delete.emit(person);
                        } catch (err) {
                            this.pageUtils.showError(err);
                        }
                        // alert.dismiss().then(() => {
                        // });
                        // return false;
                    },
                }
            ]
        });
        alert.present()
    }

    @action setNameFilter(newFilter: string) {
        this.nameFilter = newFilter;
    }
}
