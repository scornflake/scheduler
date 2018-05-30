import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Person} from "../../scheduling/people";

@Component({
    selector: 'page-people',
    templateUrl: 'people.html'
})
export class PeoplePage {

    constructor(public navCtrl: NavController, public rootStore: RootStore) {

    }

    public people(): Array<Person> {
        return this.rootStore.people_store.people;
    }

    public show_person_detail(p: Person) {
        this.navCtrl.push('PersonDetailsPage', {person: p})
    }

    ngAfterViewInit() {
        // for debug
        this.show_person_detail(this.people()[0]);
    }
}