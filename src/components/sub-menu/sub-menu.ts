import {Component} from '@angular/core';
import {NavParams, ViewController} from "ionic-angular";
import {isBoolean, isFunction} from "util";

@Component({
    selector: 'sub-menu',
    templateUrl: 'sub-menu.html'
})
export class SubMenuComponent {
    items: any[];

    constructor(
        private viewCtrlr: ViewController,
        private navParams: NavParams) {
        this.items = navParams.get('items');
    }

    callItemHandler(item: any) {
        if (item['handler']) {
            item['handler']();
        }
        this.viewCtrlr.dismiss();
    }

    itemVisible(item: any) {
        let itemElement = item['visible'];
        if (itemElement) {
            if (isFunction(itemElement)) {
                return itemElement();
            } else if (isBoolean(itemElement)) {
                return itemElement;
            }
        }
        return true;
    }
}
