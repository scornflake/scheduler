import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {LifecycleEvent, PageUtils} from "../page-utils";
import {LifecycleCallbacks} from "../../providers/server/interfaces";
import {Subject} from "rxjs";
import {delay, takeUntil} from "rxjs/operators";

@IonicPage({
    name: 'page-full',
    segment: 'full',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-full-page-preview',
    templateUrl: 'full-page-preview.html',
})
export class FullPagePreviewPage {
    private ngUnsubscribe: Subject<any>;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public server: SchedulerServer,
                public navParams: NavParams) {

        this.ngUnsubscribe = new Subject();
    }

    ngOnInit() {
        this.doStartupLifecycle();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private doStartupLifecycle() {
        this.pageUtils.runStartupLifecycleAsStream()
            .pipe(
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe((event: LifecycleEvent) => {
                this.pageUtils.executeInZone(() => {
                    switch (event.event) {
                        case LifecycleCallbacks.showError: {
                            this.pageUtils.showError(event.args);
                            break;
                        }

                        case LifecycleCallbacks.applicationHasStarted: {
                            this.store.schedule$.subscribe(() => {
                                this.pageUtils.tick();
                            });
                            break;
                        }

                        case LifecycleCallbacks.showLoginPage: {
                            this.navCtrl.setRoot('login', {});
                        }
                    }
                });
            }, err => {
                this.pageUtils.showError(err);
            }, () => {
            });
    }
}
