import {Component} from '@angular/core';

import {AboutPage} from '../about/about';
import {HomePage} from '../home/home';
import {TeamsPage} from "../teams/teams";

@Component({
    templateUrl: 'tabs.html'
})
export class TabsPage {

    tab1Root = HomePage;
    tab2Root = TeamsPage;
    tab3Root = AboutPage;

    constructor() {

    }
}
