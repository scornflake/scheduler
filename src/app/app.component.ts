import {Component, ViewChild} from '@angular/core';
import {MenuController, Nav, Platform} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {HomePage} from "../pages/home/home";
import {RootStore} from "../store/root";

@Component({
    templateUrl: 'app.html'
})
export class MyApp {
    rootPage: any = HomePage;
    @ViewChild(Nav) nav: Nav;

    constructor(private platform: Platform,
                private statusBar: StatusBar,
                private splashScreen: SplashScreen,
                private store:RootStore,
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
            {title: "Profile", page: 'page-profile'},
            {title: "People", page: 'page-people'},
            {title: "Teams", page: 'page-teams'},
            {title: "Plans", page: 'page-plans'},
            {title: "DB Maint", page: 'page-db'},
            {title: "About", page: 'page-about'},
            {
                title: "Logout", function: () => {
                    this.store.logout();
                }
            },
        ]
    }

    openPage(p) {
        if(p.function) {
            p.function();
        } else {
            this.nav.push(p.page);
        }
        this.menu.close();
    }
}
