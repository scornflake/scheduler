import {Component} from '@angular/core';
import {NavParams, ViewController} from "ionic-angular";
import {isBoolean, isFunction} from "util";

@Component({
    selector: 'sub-menu',
    templateUrl: 'sub-menu.html'
})
export class SubMenuComponent {
    items: any[];
    public visibleItems: any[];

    constructor(
        private viewCtrlr: ViewController,
        private navParams: NavParams) {
        this.items = navParams.get('items');
        this.visibleItems = this.items.filter(item => this.testItemFor(item, 'visible'));
    }

    testItemFor(item, term) {
        let itemCall = item[term];
        if (itemCall !== undefined) {
            if (isFunction(itemCall)) {
                return itemCall();
            } else if (isBoolean(itemCall)) {
                return itemCall;
            }
        }
        return true;
    }

    callItemHandler(item: any) {
        if (this.testItemFor(item, 'enabled') == false) {
            return;
        }
        if (item['handler']) {
            item['handler']();
        }
        this.viewCtrlr.dismiss();
    }
}
