import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {Person} from "../../scheduling/people";
import {AlertController, List, NavController} from "ionic-angular";
import {PageUtils} from "../../pages/page-utils";
import {ObjectValidation} from "../../scheduling/shared";
import {NamedObject} from "../../scheduling/base-types";
import {action, computed, observable} from "mobx-angular";
import {RootStore} from "../../store/root";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {runInAction} from "mobx";

@Component({
    selector: 'people',
    templateUrl: 'people.html',
})
export class PeopleComponent {
    @observable private _people: Array<Person>;

    get people(): Array<Person> {
        return this._people;
    }

    @Input() readonly: boolean = false;

    @Input('people')
    set people(value: Array<Person>) {
        runInAction(() => {
            this._people = value;
        });
    }


    @Output() delete = new EventEmitter<Person>();
    @Output() personAdded = new EventEmitter<Person>();

    @observable nameFilter: string = "";
    @observable inviteMode: boolean;

    @ViewChild(List) personList;

    private selections = [];

    constructor(private navCtrl: NavController,
                private pageUtils: PageUtils,
                private store: RootStore,
                private server: SchedulerServer,
                private alertCtrl: AlertController) {
        this.inviteMode = false;
    }

    @computed get sortedPeople(): Array<Person> {
        let people = NamedObject.sortByName(this._people);
        if (this.nameFilter.length > 0) {
            people = people.filter(p => p.name.toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0);
        }
        return people;
    }

    @computed get filteredPeople(): Array<Person> {
        let people = this.sortedPeople;
        if (this.inviteMode) {
            // only show people that have email addresses
            people = people.filter(p => p.email && p.email.length > 0);
        }
        // console.warn(`PeopleComponent returning filtered people to template, ${people.map(p => p.name).join(", ")}`);
        return people;
    }

    @computed get numPeopleWithoutEmail(): number {
        if (this.inviteMode) {
            return this.sortedPeople.length - this.filteredPeople.length;
        }
        return 0;
    }

    @computed get numPeopleSelected(): number {
        if (this.inviteMode) {
            return this.selections.length;
        }
        return 0;
    }

    public showPersonDetail(person: Person) {
        if (this.inviteMode) {
            return;
        }
        this.navCtrl.push('PersonDetailsPage', {person: person})
    }

    personSummary(person: Person, showTeams: boolean = false): string {
        let things: Array<any> = [person.availability];
        if (showTeams) {
            let inTeams = this.store.teams.findAllWithPerson(person);
            if (inTeams.length) {
                let listOfTeams = inTeams.map(t => t.name).join(", ");
                things.push(`in teams: ${listOfTeams}`);
            }
        }
        return things.join(", ");
    }

    personSummaryRight(person: Person, showTeams: boolean = false): string {
        let things: Array<any> = [];
        if (person.email) {
            things.push(person.email);
        }
        return things.join(", ");
    }

    invitePeople() {
        this.inviteMode = !this.inviteMode;
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
                        // For some reason have to do this, or they dont close
                        if (this.personList) {
                            this.personList.closeSlidingItems();
                        }
                    }
                },
                {
                    text: 'Delete',
                    role: 'cancel',
                    handler: () => {
                        // For some reason have to do this, or they dont close
                        if (this.personList) {
                            this.personList.closeSlidingItems();
                        }
                        try {
                            this.delete.emit(person);
                        } catch (err) {
                            this.pageUtils.showError(err);
                        }
                    },
                }
            ]
        });
        alert.present()
    }

    @action setNameFilter(newFilter: string) {
        this.nameFilter = newFilter;
    }

    isSelected(person: Person): boolean {
        return this.selections.find(p => p.uuid == person.uuid) != null;
    }

    selectPerson($event, person) {
        if (this.isSelected(person)) {
            let index = this.selections.findIndex(p => p.uuid == person.uuid);
            this.selections.splice(index, 1);
        } else {
            this.selections.push(person);
        }
    }

    sendInvites() {
        try {
            this.server.sendInvites(this.selections).then(() => {
                this.pageUtils.showMessage(`Sent ${this.numPeopleSelected} invites`);
                this.inviteMode = false;
                this.selections = [];
            }, err => this.pageUtils.showError(err))
        } catch (err) {
            this.pageUtils.showError(err);
        }
    }
}
