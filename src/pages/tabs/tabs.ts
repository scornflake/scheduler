import {Component} from '@angular/core';

import {AboutPage} from '../about/about';
import {HomePage} from '../home/home';
import {AdministrationPage} from "../administration/administration";

@Component({
    templateUrl: 'tabs.html'
})
export class TabsPage {

    tab1Root = HomePage;
    tab2Root = AdministrationPage;
    tab3Root = AboutPage;

    constructor() {

    }
}
