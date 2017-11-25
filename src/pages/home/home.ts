import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {RootStore} from "../../state/root";

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {

    constructor(public navCtrl: NavController, private store: RootStore) {
    }

    clear_selection() {
        this.store.ui_store.selected_person = null;
    }
}
