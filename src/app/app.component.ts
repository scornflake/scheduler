import {Component, ViewChild} from '@angular/core';
import {MenuController, Nav, Platform} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {HomePage} from "../pages/home/home";

@Component({
    templateUrl: 'app.html'
})
export class MyApp {
    rootPage: any = HomePage;
    @ViewChild(Nav) nav: Nav;

    constructor(private platform: Platform,
                private statusBar: StatusBar,
                private splashScreen: SplashScreen,
                private menu: MenuController) {
        this.menu.enable(true, 'menu');
        platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            statusBar.styleDefault();
            splashScreen.hide();
        });
    }

    pages() {
        return [
            {title: "Dashboard", page: 'home'},
            {title: "People", page: 'page-people'},
            {title: "Teams", page: 'page-teams'},
            {title: "Plans", page: 'page-plans'},
            {title: "DB Maint", page: 'page-db'},
            {title: "About", page: 'page-about'},
        ]
    }

    openPage(p) {
        this.menu.close();
        this.nav.push(p.page);
    }
}
