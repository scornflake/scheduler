import {ObjectValidation} from "../scheduling/shared";
import {NavController, Platform, ToastController} from "ionic-angular";
import {forwardRef, Inject, Injectable, Injector, OnInit} from "@angular/core";
import deepEqual from "deep-equal";
import {ToastOptions} from "ionic-angular/components/toast/toast-options";
import {SafeJSON} from "../common/json/safe-stringify";
import {SchedulerServer} from "../providers/server/scheduler-server.service";
import {LoggingWrapper} from "../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {LoginCallback} from "../common/interfaces";
import {IDependencyTree, IObserverTree} from "mobx";


@Injectable()
class PageUtils implements OnInit {
    private logger: Logger;

    constructor(private toastController: ToastController,
                private injector: Injector,
                @Inject(forwardRef(() => SchedulerServer)) private server,
                private platform: Platform) {
        this.logger = LoggingWrapper.getLogger('page.utils');
    }

    ngOnInit() {
    }

    public show_validation_error(validation: ObjectValidation, stay_open: boolean = false) {
        this.show_alert(validation.errors.join(", "), {cssClass: 'validation'}, stay_open);
    }

    get small(): boolean {
        return this.platform.width() <= 576;
    }

    public show_error(message: string) {
        this.show_alert(message, {cssClass: 'validation'}, false);
    }

    show_message(message: string) {
        this.show_alert(message, {cssClass: 'success'}, false);
    }

    checkLogin(callback: LoginCallback) {
        let readyEvent = this.server.readyEvent;
        readyEvent.subscribe(value => {
            if (value) {
                this._doCheckLogin(callback);
            }
        });
    }

    validateLoginAndShowPageIfNotValid(navCtrl: NavController) {
        if (navCtrl == null) {
            throw new Error(`navCtrl is required`);
        }
        this.checkLoginAndRedirect(navCtrl, 'login');
    }

    checkLoginAndRedirect(navCtrl: NavController, pageToGoToIfBad: string) {
        this.checkLogin(validationOK => {
            if (!validationOK) {
                // noinspection JSIgnoredPromiseFromCall
                navCtrl.push(pageToGoToIfBad);
            }
        })
    }

    private _doCheckLogin(callback: LoginCallback) {
        let validateLoginToken = this.server.validateLoginToken();
        validateLoginToken.then(resp => {
            if (!resp.ok) {
                this.logger.info(`Validation returned: ${SafeJSON.stringify(resp)}`);
                callback(true);
            } else {
                this.logger.info(`Validation ok: ${SafeJSON.stringify(resp)}`);
                callback(false);
            }
        });
    }

    private show_alert(message, more_options: ToastOptions, stay_open: boolean = false) {
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
    ObjectUtils
}