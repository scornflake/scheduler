import {Component, ViewChild} from '@angular/core';
import {MenuController, Nav, Platform} from 'ionic-angular';
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {HomePage} from "../pages/home/home";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {computed} from "mobx-angular";
import {autorun} from "mobx";
import {isUndefined} from "util";
import {NativePageTransitions} from "@ionic-native/native-page-transitions";
import {AccessControlProvider, ResourceType} from "../providers/access-control/access-control";
import {Deeplinks} from "@ionic-native/deeplinks";
import {LoginPage} from "../pages/login/login";

@Component({
    templateUrl: 'app.html',
    // DONT DO THIS. IT BORKS THE APP ENTIRELY
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyApp {
    rootPage: any = HomePage;
    @ViewChild(Nav) nav: Nav;

    frozenGroups: any;

    constructor(private platform: Platform,
                private statusBar: StatusBar,
                private splashScreen: SplashScreen,
                private native: NativePageTransitions,
                private access: AccessControlProvider,
                private server: SchedulerServer,
                private deeplinks: Deeplinks,
                private menu: MenuController) {
        this.menu.enable(true, 'menu');
        this.frozenGroups = [];

        this.platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            this.statusBar.styleDefault();
            this.splashScreen.hide();
            console.warn('Platform says ready');

            try {
                this.rebuildGroupsOnChange();
            } catch (err) {
                console.error(`Boom while doing rebuildGroupsOnChange: ${err}`);
            }

        });
    }

    ngOnInit() {
        this.platform.ready().then(() => {
            console.warn('Deeplinking started listening...');
            this.deeplinks.route({
                '/login': LoginPage
            }).subscribe(match => {
                console.warn(`Deeplinking Routing to ${match}`);
            }, err => {
                console.warn(`Deeplinking Got link that didnt exist: ${err}`);
            }, () => {
                console.warn(`Deeplinking is done`);
            });
        });
    }

    private rebuildGroupsOnChange() {
        // Work out the groups, based on current state.
        // If the logged in state changes, autorun should re-work out the groups
        autorun(() => {
            // trace();
            this.frozenGroups = this.evaluateGroups(this.groups);
        }, {
            name: 'work out the menus'
        })
    }

    @computed get loggedIn(): boolean {
        if (this.server) {
            return this.server.isLoggedIn;
        }
        return false;
    }

    loggedInAsManager(resource: ResourceType): boolean {
        if (this.server) {
            return this.server.isLoggedIn && this.access.canUpdateAny(resource);
        }
        return false;
    }

    get groups() {
        return [
            {
                title: "", items: [
                    {title: "Dashboard", page: 'home'},
                    {title: "Login", page: LoginPage, visible: () => !this.loggedIn},
                    {title: "Profile", page: 'page-profile', enabled: () => this.loggedIn},
                ]
            },
            {
                title: "Details", visible: () => this.loggedIn, items: [
                    {title: "Roles", page: 'page-roles', visible: () => this.loggedInAsManager(ResourceType.Role)},
                    {title: "People", page: 'page-people', visible: () => this.loggedInAsManager(ResourceType.People)},
                    {title: "Teams", page: 'page-teams', visible: () => this.loggedInAsManager(ResourceType.Team)},
                    {title: "Plans", page: 'page-plans', enabled: () => this.loggedIn},
                ]
            },
            {
                title: "Other", visible: () => this.loggedIn, items: [
                    {
                        title: "Logout", exec: () => {
                            this.server.asyncLogout().then(() => {
                                this.nav.setRoot(LoginPage);
                            });
                        },
                        enabled: () => this.loggedIn
                    },
                    {title: "About", page: 'page-about'},
                ]
            },
            {
                title: "Dev", visible: () => this.devVisible, items: [
                    {title: "Test Page", page: 'page-test-utils'},
                    {title: "DB Maint", page: 'page-db'},
                ]
            },
        ]
    }

    get devVisible(): boolean {
        return this.access.isSuperuser();
    }

    openPage(p) {
        if (p.exec) {
            p.exec();
        } else {
            this.native.slide(null);
            this.nav.push(p.page);
        }
        this.menu.close();
    }

    private evalFunc(group, key: string, defaultValue) {
        if (isUndefined(group[key])) {
            return defaultValue;
        }
        if (typeof group[key] === 'function') {
            let flag = group[key]();
            // console.log(`eval ${group[key]} = ${flag}`);
            return flag;
        }
        return group[key];
    }

    private evaluateGroups(groups) {
        return groups.map(grp => {
            grp['visible'] = this.evalFunc(grp, 'visible', true);
            grp['enabled'] = this.evalFunc(grp, 'enabled', true);
            if (grp['items']) {
                grp['items'] = this.evaluateGroups(grp['items']);
            }
            // console.log(`eval: ${grp.title}, visible: ${grp.visible}, enabled: ${grp.enabled}`);
            return grp;
        })
    }
}
