import {ObjectValidation} from "../scheduling/shared";
import {AlertController, NavController, ToastController} from "ionic-angular";
import {forwardRef, Inject, Injectable, NgZone, OnInit} from "@angular/core";
import deepEqual from "deep-equal";
import {ToastOptions} from "ionic-angular/components/toast/toast-options";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {Logger, LoggingService} from "ionic-logging-service";
import {IDependencyTree, IObserverTree} from "mobx";
import {ILifecycleCallback, LifecycleCallbacks} from "../providers/server/interfaces";
import {ServerError} from "../common/interfaces";
import {NativePageTransitions} from "@ionic-native/native-page-transitions";
import {Observable} from "rxjs/Observable";
import {BehaviorSubject, Subscription} from "rxjs";
import {TokenStates} from "../providers/token/authorization.service";
import {AccessControlProvider, ResourceType} from "../providers/access-control/access-control";
import {RootStore} from "../store/root";

interface LifecycleEvent {
    event: LifecycleCallbacks;
    args: any;
}

@Injectable()
class PageUtils implements OnInit {
    private logger: Logger;
    private authNotificationSubscription: Subscription;

    constructor(private toastController: ToastController,
                private alertCtrlr: AlertController,
                private logService: LoggingService,
                private access: AccessControlProvider,
                @Inject(forwardRef(() => RootStore)) private store,
                private nativeTransitions: NativePageTransitions,
                private zoneRef: NgZone,
                @Inject(forwardRef(() => SchedulerServer)) private server) {
        this.logger = logService.getLogger('page.utils');
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

    canManage(resource: ResourceType, logging: boolean = false) {
        return this.access.canUpdateAny(resource);
    }

    canEdit(resource: ResourceType, ownResource: boolean = false, logging: boolean = false) {
        // Can edit if this person == logged in person
        if (!this.store) {
            this.logger.debug(`Can edit ${resource}? No, no store instance`);
            return false;
        }
        if (!this.store.loggedInPerson) {
            this.logger.debug(`Can edit ${resource}? No, no logged in person`);
            return false;
        }
        return ownResource ? this.access.canUpdateOwn(resource, logging) : this.access.canUpdateAny(resource, logging);
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
                this.nativeTransitions.fade({duration: 1000});
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
        this.logger.debug(`Starting lifecycle as a stream`);
        let subject = new BehaviorSubject<any>({event: LifecycleCallbacks.initialState, args: null});
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

        if (this.authNotificationSubscription) {
            this.authNotificationSubscription.unsubscribe();
            this.authNotificationSubscription = null;
        }

        this.authNotificationSubscription = this.server.authTokenLifecycleNotifications.subscribe(st => {
            switch (st) {
                case TokenStates.TokenInvalid: {
                    subject.next({event: LifecycleCallbacks.showLoginPage, args: 'JWT token invalid'});
                    break;
                }

                case TokenStates.TokenWasRefreshed: {
                    break;
                }

                default:
                case TokenStates.TokenOK: {
                    this.logger.info('JWT Token OK');
                    break;
                }
            }
        });

        this.server.asyncRunStartupLifecycle(callback).then(() => {
            this.logger.debug(`Lifecycle as a stream - completed`);
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