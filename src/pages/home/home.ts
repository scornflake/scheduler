import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {StoreProvider} from "../../providers/store/store";

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {

    constructor(public navCtrl: NavController, private store: StoreProvider) {
    }

    clear_selection() {
        this.store.ui_store.selected_person = null;
    }
}
