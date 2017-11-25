import {Component} from '@angular/core';

import {AboutPage} from '../about/about';
import {HomePage} from '../home/home';
import {PeoplePage} from "../people/people";

@Component({
    templateUrl: 'tabs.html'
})
export class TabsPage {

    tab1Root = HomePage;
    tab2Root = PeoplePage;
    tab3Root = AboutPage;

    constructor() {

    }
}
