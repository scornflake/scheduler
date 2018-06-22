import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AlertController, IonicPage, Loading, LoadingController, NavController, NavParams, Slides} from 'ionic-angular';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators} from "@angular/forms";
import "rxjs/add/operator/debounceTime";
import {Logger, LoggingService} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {PageUtils} from "../page-utils";
import {action, observable} from "mobx-angular";
import {isUndefined} from "util";
import {debounceTime, flatMap, map} from "rxjs/operators";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import {SafeJSON} from "../../common/json/safe-stringify";
import {ServerError} from "../../common/interfaces";

enum LoginPageMode {
    LoginOrCreate = 0,
    WaitForEmailConfirmation,
    ReadyToGo
}

@IonicPage({
    defaultHistory: ['home'],
    name: 'login'
})
@Component({
    selector: 'page-login',
    templateUrl: 'login.html',
})
class LoginPage implements AfterViewInit {
    loginForm: FormGroup;
    loading: Loading;

    @observable registrationName: string;
    @observable registrationEmail: string;
    @observable registrationPassword: string;

    @observable isCreateAccount: boolean = false;

    @ViewChild(Slides) slides: Slides;

    private logger: Logger;
    private firstSwitch: boolean = true;
    private confirmationListener: Observable<any> = null;
    private confirmationSubscription: Subscription = null;

    constructor(protected nav: NavController,
                protected navParams: NavParams,
                protected alertCtrl: AlertController,
                protected logService: LoggingService,
                protected server: SchedulerServer,
                protected formBuilder: FormBuilder,
                protected pageUtils: PageUtils,
                protected loadingCtrl: LoadingController) {

        this.logger = this.logService.getLogger("page.login");
        this.isCreateAccount = this.navParams.get('create');

        if (isUndefined(this.isCreateAccount)) {
            // for testing
            setTimeout(() => {
                this.setRegistrationName("Neil Clayton");
                this.setRegistrationEmail("neil@cloudnine.net.nz");
                this.setRegistrationPassword("testing59");
                // this.register();
            }, 250)
        }
    }

    ngAfterViewInit(): void {
        if (this.isCreateAccount) {
            this.switchToCreate();
        } else {
            this.switchToLogin();
        }
        this.firstSwitch = true;
    }

    @action setRegistrationPassword(value: string) {
        this.registrationPassword = value;
    }

    @action setRegistrationName(value: string) {
        this.registrationName = value;
    }

    @action setRegistrationEmail(value: string) {
        this.registrationEmail = value;
    }

    validateUsernameUsable(control: AbstractControl): Observable<ValidationErrors> {
        // hmm. wonder how I get NG to NOT create an observable every time?
        // console.warn(`creating a new control observable`);
        return new Observable(obs => {
            obs.next(control.value);
            obs.complete();
        }).pipe(
            debounceTime(1000),
            flatMap((addr: string) => this.server.isUsernameAvailableAndGood(addr)),
            map((goodOrBad: string) => {
                // for testing
                if (control.value == "neil@cloudnine.net.nz") {
                    return null;
                }
                // console.log(`checker got: ${goodOrBad}`);
                return goodOrBad == 'bad' ? {'inUse': "Email address already in use."} : null
            })
        );
    }

    public register() {
        this.server.registerNewUser(this.registrationName, this.registrationEmail, this.registrationPassword).then(user => {
            this.switchModes(LoginPageMode.WaitForEmailConfirmation);
            this.startListeningForConfirmation();
        }).catch(boom => {
            this.switchToCreate();
            this.showError(boom);
        });
    }

    public login() {
        this.showLoading();
        let username = this.registrationEmail;
        let password = this.registrationPassword;

        // this.logger.info(`Starting login... using ${username} and ${password}`);
        this.logger.info(`Starting login for: ${username}`);
        this.server.loginUser(username, password).then(({user, ok, detail}) => {
            this.logger.info(`Login completed ${ok}: ${detail}`);
            if (!ok) {
                this.showError(detail);
            } else {
                // Using this rather that this.nav.pop(), so it works
                // when the page is hit directly as a deep link
                this.nav.setRoot('home')
            }
        }, (error) => {
            console.error(`got login error: ${JSON.stringify(error)}`);
            this.showError(error);
        });
    }

    showPopup(title, subtitle, buttonText = "OK", handler = (data) => {
    }) {
        let options = {
            title: title,
            subTitle: subtitle,
        };
        if (buttonText.length) {
            options['buttons'] = [
                {
                    text: buttonText,
                    handler: handler
                }
            ];
        }
        let alert = this.alertCtrl.create(options);
        alert.present();
        return alert;
    }

    showLoading() {
        this.loading = this.loadingCtrl.create({
            content: 'Please wait [login]...',
            dismissOnPageChange: true
        });
        this.loading.present();
    }

    showError(error) {
        if(this.loading) {
            this.loading.dismiss();
        }

        let text = error;
        if(error instanceof ServerError) {
            text = error.allErrors;
        }

        let alert = this.alertCtrl.create({
            title: 'Opps!',
            subTitle: text,
            buttons: ['OK']
        });
        alert.present(error);
    }

    @action
    switchModes(mode: LoginPageMode) {
        switch (mode) {
            case LoginPageMode.LoginOrCreate: {
                /*
                BUG in Ionic.
                If you slideTo immediately the page loads, it'll die.
                Have to wait until "something" is instantiated.
                 */
                let waitPeriod = this.firstSwitch ? 1000 : 0;
                setTimeout(() => {
                    this.slides.slideTo(0);
                }, waitPeriod);
                this.firstSwitch = false;
            }
                break;

            case LoginPageMode.WaitForEmailConfirmation:
            default: {
                this.slides.slideTo(1);
                break;
            }

            case LoginPageMode.ReadyToGo: {
                this.slides.slideTo(2);
                break;
            }
        }
    }

    @action
    switchToCreate() {
        this.loginForm = this.formBuilder.group({
            'name': ["", [Validators.required]],
            'email': ["",
                [Validators.email, Validators.required],
                this.validateUsernameUsable.bind(this)
            ],
            'password': ["", [Validators.required, Validators.minLength(8)]],
        });
        // this.loginForm.reset();
        this.isCreateAccount = true;
        this.switchModes(LoginPageMode.LoginOrCreate);
    }

    @action
    switchToLogin() {
        this.loginForm = this.formBuilder.group({
            'email': ["", [Validators.email, Validators.required]],
            'password': ["", [Validators.required, Validators.minLength(8)]],
        });
        // this.loginForm.reset();
        this.isCreateAccount = false;
        this.switchModes(LoginPageMode.LoginOrCreate);
    }

    cancelWaitingForConfirmation() {
        this.stopListeningForConfirmation();
        this.switchModes(LoginPageMode.LoginOrCreate);
    }

    private startListeningForConfirmation() {
        if (!this.confirmationListener) {
            this.confirmationListener = Observable.timer(2000, 2000);
            console.log(`waiting on confirmation for ${this.registrationEmail}`);
            this.confirmationSubscription = this.confirmationListener.subscribe(() => {
                this.server.hasEmailBeenConfirmed(this.registrationEmail).then(flag => {
                    if (flag) {
                        this.switchToReadyToUse();
                    }
                })
            })
        } else {
            console.warn(`already have a confirmation listener, skipping`);
        }
    }

    private switchToReadyToUse() {
        this.stopListeningForConfirmation();
        this.switchModes(LoginPageMode.ReadyToGo);
    }

    private stopListeningForConfirmation() {
        this.confirmationSubscription.unsubscribe();
        this.confirmationListener = null;
    }

    popBackHome() {
        this.stopListeningForConfirmation();

        // Right. Now we can use the info to do a direct login.
        // Assuming the login works, it'll kick off the standard workflow.
        this.login();

        // this.nav.popTo('home');
    }
}

export {
    LoginPage
}