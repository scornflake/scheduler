import {ObjectValidation} from "../scheduling/shared";
import {AlertController, NavController, Platform, ToastController} from "ionic-angular";
import {forwardRef, Inject, Injectable, NgZone, OnInit} from "@angular/core";
import deepEqual from "deep-equal";
import {ToastOptions} from "ionic-angular/components/toast/toast-options";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {IDependencyTree, IObserverTree} from "mobx";
import {ILifecycleCallback, LifecycleCallbacks} from "../providers/server/interfaces";
import {ServerError} from "../common/interfaces";
import {NativePageTransitions} from "@ionic-native/native-page-transitions";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";

interface LifecycleEvent {
    event: LifecycleCallbacks;
    args: any;
}

@Injectable()
class PageUtils implements OnInit {
    private logger: Logger;

    constructor(private toastController: ToastController,
                private alertCtrlr: AlertController,
                private nativeTransitions: NativePageTransitions,
                private zoneRef: NgZone,
                @Inject(forwardRef(() => SchedulerServer)) private server,
                private platform: Platform) {
        this.logger = LoggingWrapper.getLogger('page.utils');
    }

    ngOnInit() {
    }

    public showValidationError(validation: ObjectValidation, stay_open: boolean = false) {
        this.show_alert(validation.errors.join(", "), {cssClass: 'validation'}, stay_open);
    }

    public showError(message: string | ServerError, stayOpen: boolean = false) {
        this.show_alert(message, {cssClass: 'validation'}, stayOpen);
    }

    showMessage(message: string) {
        this.show_alert(message, {cssClass: 'success'}, false);
    }

    lifecycleCallback(navCtrl: NavController): ILifecycleCallback {
        if (navCtrl == null) {
            throw new Error(`navCtrl is required`);
        }
        return {
            showLoginPage: (reason: string) => {
                this.logger.info(`show login page, because: ${reason}`);
                navCtrl.push('login');
            },
            applicationIsStarting: () => {
            },
            applicationHasStarted: (ok: boolean) => {
                // if it started ok, go to the dashboard
                // Using this rather that this.nav.pop(), so it works
                // when the page is hit directly as a deep link
                navCtrl.setRoot('home', {})
            },
            showCreateOrInvitePage: (reason: string) => {
                // add args to tell it to switch to create mode
                this.logger.info(`show create/invite page, because: ${reason}`);
                // this.nativeTransitions.fade({duration: 1000});
                navCtrl.push('login');
            },
            showError: (message) => {
                this.showError(message);
            }
        } as ILifecycleCallback;
    }


    async runStartupLifecycle(navCtrl: NavController): Promise<boolean> {
        return await this.server.asyncRunStartupLifecycle(this.lifecycleCallback(navCtrl));
    }

    runStartupLifecycleAsStream(): Observable<LifecycleEvent> {
        let subject = new Subject<any>();
        let callback: ILifecycleCallback = {
            showLoginPage: (reason: string) => {
                subject.next({event: LifecycleCallbacks.showLoginPage, args: reason})
            },
            applicationIsStarting: () => {
                subject.next({event: LifecycleCallbacks.applicationIsStarting, args: null})
            },
            applicationHasStarted: (ok: boolean) => {
                subject.next({event: LifecycleCallbacks.applicationHasStarted, args: ok})
            },
            showCreateOrInvitePage: (reason: string) => {
                subject.next({event: LifecycleCallbacks.showCreateOrInvitePage, args: reason})
            },
            showError: (message: string | ServerError) => {
                subject.next({event: LifecycleCallbacks.showError, args: message})
            }
        };
        this.server.asyncRunStartupLifecycle(callback).then(() => {
            subject.complete();
        });
        return subject;
    }

    async runStartupLifecycleAfterLogin(navCtrl: NavController): Promise<boolean> {
        return await this.server.asyncRunStartupLifecycleAfterLogin(this.lifecycleCallback(navCtrl));
    }

    executeInZone(func) {
        if (this.zoneRef) {
            this.zoneRef.run(func);
        } else {
            func();
        }
    }

    areYouSure(message: string = "Are you sure?", okButtonText: string = "Delete", okHandler) {
        let alert = this.alertCtrlr.create({
            message: message,
            buttons: [
                {
                    text: 'Cancel',
                    handler: () => {
                    }
                },
                {
                    text: okButtonText,
                    role: 'cancel',
                    handler: () => {
                        okHandler();
                    },
                }
            ]
        });
        alert.present();
    }


    private show_alert(message: string | ServerError, more_options: ToastOptions, stay_open: boolean = false) {
        if (message instanceof ServerError) {
            message = message.humanReadable;
        }
        let options = {
            message: message,
            showCloseButton: stay_open
        };
        if (more_options) {
            Object.assign(options, more_options);
        }
        if (!stay_open) {
            options['duration'] = 3000;
        }
        let t = this.toastController.create(options);
        t.present();
    }

}


@Injectable()
class ObjectUtils {
    static deep_equal(old_data, new_data): boolean {
        return deepEqual(old_data, new_data);
    }

    static gap(width: number): string {
        return " ".repeat(width * 2);
    }

    static printDependencyTree(tree: IDependencyTree, nesting: number = 0) {
        if (!tree) {
            return;
        }
        console.log(`${ObjectUtils.gap(nesting)}- ${tree.name}`);
        if (tree.dependencies) {
            for (let dep of tree.dependencies) {
                ObjectUtils.printDependencyTree(dep, nesting + 1);
            }
        }
    }

    static printObserverTree(tree: IObserverTree, nesting: number = 0) {
        if (!tree) {
            return;
        }
        console.log(`${ObjectUtils.gap(nesting)}- ${tree.name}`);
        if (tree.observers) {
            for (let obs of tree.observers) {
                ObjectUtils.printObserverTree(obs, nesting + 1);
            }
        }
    }
}

export {
    PageUtils,
    ObjectUtils,
    LifecycleEvent
}