import {Component, ViewChild} from '@angular/core';
import {MenuController, Nav, Platform} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {HomePage} from "../pages/home/home";
import {RootStore} from "../store/root";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {computed} from "mobx-angular";

@Component({
    templateUrl: 'app.html'
})
export class MyApp {
    rootPage: any = HomePage;
    @ViewChild(Nav) nav: Nav;

    constructor(private platform: Platform,
                private statusBar: StatusBar,
                private splashScreen: SplashScreen,
                private server: SchedulerServer,
                private menu: MenuController) {
        this.menu.enable(true, 'menu');
        platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            statusBar.styleDefault();
            splashScreen.hide();
        });
    }

    loggedIn() {
        if (this.server) {
            return this.server.loggedIn;
        }
        return false;
    }

    isEnabled(pageOrGroup): boolean {
        if (pageOrGroup) {
            if (pageOrGroup.hasOwnProperty('enabled')) {
                return pageOrGroup['enabled']();
            }
        }
        return true;
    }

    isVisible(pageOrGroup): boolean {
        if (pageOrGroup) {
            if (pageOrGroup.hasOwnProperty('visible')) {
                return pageOrGroup['visible']();
            }
        }
        return true;
    }

    get groups() {
        return [
            {
                title: "", items: [
                    {title: "Dashboard", page: 'home'},
                    {title: "Profile", page: 'page-profile', enabled: this.loggedIn},
                    {title: "About", page: 'page-about'},
                ]
            },
            {
                title: "Admin", items: [
                    {title: "People", page: 'page-people', enabled: this.loggedIn},
                    {title: "Teams", page: 'page-teams', enabled: this.loggedIn},
                    {title: "Plans", page: 'page-plans', enabled: this.loggedIn},
                ]
            },
            {
                title: "Dev", items: [
                    {title: "DB Maint", page: 'page-db'},
                ]
            },
            {
                title: "", visible: this.loggedIn, items: [
                    {
                        title: "Logout", exec: () => {
                            this.server.logout();
                            this.nav.popToRoot();
                        },
                        enabled: this.loggedIn
                    }
                ]
            },
        ]
    }

    pagesOfGroup(group) {
        return group.items;
    }

    openPage(p) {
        if (p.exec) {
            p.exec();
        } else {
            this.nav.push(p.page);
        }
        this.menu.close();
    }
}
