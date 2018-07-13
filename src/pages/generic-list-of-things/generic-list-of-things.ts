import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';

@IonicPage({
    name: 'list-of-things'
})
@Component({
    selector: 'page-generic-list-of-things',
    templateUrl: 'generic-list-of-things.html',
})
export class GenericListOfThingsPage {
    things: Array<any>;
    title: string;

    item_pressed_callback: (thing) => boolean;
    cancel_callback: () => boolean;
    label_callback: (thing) => string;

    show_push: boolean = true;

    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.things = this.navParams.get('things');
        this.title = this.navParams.get('title');
        this.cancel_callback = this.navParams.get('cancel-pressed');
        this.label_callback = this.navParams.get('label-name');

        this.item_pressed_callback = this.navParams.get('item-pressed');
        this.show_push = this.navParams.get('show-push');


        if (!this.label_callback) {
            this.label_callback = (thing) => {
                return thing.toString()
            }
        }

        if (!this.cancel_callback) {
            this.cancel_callback = () => {
                return true;
            }
        }

        if (!this.item_pressed_callback) {
            this.item_pressed_callback = (thing) => {
                return true;
            }
        }
    }

    item_pressed(event) {
        if (this.item_pressed_callback(event)) {
            // this.navCtrl.pop();
        }
    }

    cancel_pressed(event) {
        if (this.cancel_callback()) {
            this.navCtrl.pop();
        }
    }

    label_for_thing(thing: any) {
        return this.label_callback(thing);
    }
}
