import {AfterViewInit, Component, OnDestroy, ViewChild} from '@angular/core';
import {AlertController, IonicPage, Loading, LoadingController, NavController, NavParams, Slides} from 'ionic-angular';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators} from "@angular/forms";
import "rxjs/add/operator/debounceTime";
import {Logger, LoggingService} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {PageUtils} from "../page-utils";
import {action, observable} from "mobx-angular";
import {debounceTime, filter, flatMap, map, take, timeout} from "rxjs/operators";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import {ServerError} from "../../common/interfaces";
import "rxjs/add/observable/timer";
import {Storage} from '@ionic/storage';
import {runInAction} from "mobx";

enum LoginPageMode {
    LoginOrCreate = 0,
    WaitForEmailConfirmation,
    StartingReplication,
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
class LoginPage implements AfterViewInit, OnDestroy {
    loginForm: FormGroup;
    loading: Loading;

    @observable registrationName: string;
    @observable registrationEmail: string;
    @observable registrationPassword: string;

    @observable isCreateAccount: boolean = false;

    @ViewChild(Slides) slides: Slides;

    private logger: Logger;
    private firstSwitch: boolean = true;
    private confirmationSubscription: Subscription = null;

    constructor(protected nav: NavController,
                protected navParams: NavParams,
                protected alertCtrl: AlertController,
                protected logService: LoggingService,
                protected server: SchedulerServer,
                protected storage: Storage,
                protected formBuilder: FormBuilder,
                protected pageUtils: PageUtils,
                protected loadingCtrl: LoadingController) {

        this.logger = this.logService.getLogger("page.login");
        this.isCreateAccount = this.navParams.get('create');
    }

    ngAfterViewInit(): void {
        this.storage.get('last.login.email').then(v => {
            runInAction(() => {
                this.registrationEmail = v;
            });
        });

        this.firstSwitch = true;
        if (this.isCreateAccount) {
            this.switchToCreate();
        } else {
            this.switchToLogin();
        }
        this.slides.lockSwipes(true);
        this.slides.enableKeyboardControl(false);
    }

    ngOnDestroy(): void {
        this.stopListeningForConfirmation();
    }

    @action setRegistrationPassword(value: string) {
        this.registrationPassword = value;
    }

    @action setRegistrationName(value: string) {
        this.registrationName = value;
    }

    @action setRegistrationEmail(value: string) {
        this.registrationEmail = value;
        this.storage.set('last.login.email', value);
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

        this.logger.info(`Starting login with ${username}`);
        this.server.loginUser(username, password).then(({user, ok, detail}) => {
            this.logger.info(`Login completed ${ok}: ${detail}`);
            if (!ok) {
                this.showError(detail);
            } else {
                // If it's good, we start the lifecycle.
                // That'll load all the data and kick us back to home
                this.pageUtils.runStartupLifecycleAfterLogin(this.nav);

                // Assumption is that the lifecycle callback is called with something
                // e.g: 'app has started' or 'error'
                // thus there's no explicit code here to do anything
            }
        }, (error) => {
            if (error instanceof ServerError) {
                if (error.isHTTPServerNotThere) {
                    this.showError('Server cannot be contacted. Are you online?');
                    return;
                }
            }
            console.error(`Got login error: ${JSON.stringify(error)}`);
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
        if (this.loading) {
            this.loading.dismiss();
        }

        let text = error;
        if (error instanceof ServerError) {
            text = error.allErrors;
        } else if (typeof(error) === 'object') {
            text = JSON.stringify(error);
        }

        let alert = this.alertCtrl.create({
            title: 'Opps!',
            subTitle: text,
            buttons: ['OK']
        });
        alert.present();
    }

    @action
    switchModes(mode: LoginPageMode) {
        this.logger.info(`Switching to mode: ${mode}`);
        // The modes are really just indexes into the slides
        /*
        BUG in Ionic.
        If you slideTo immediately the page loads, it'll die.
        Have to wait until "something" is instantiated.
         */
        let waitPeriod = this.firstSwitch ? 1000 : 0;
        setTimeout(() => {
            this.slides.lockSwipes(false);
            this.slides.slideTo(mode);
            this.slides.lockSwipes(true);
        }, waitPeriod);
        this.firstSwitch = false;
    }

    @action
    switchToCreate() {
        this.logger.info(`Switching to create`);
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
        this.logger.info(`Switching to login`);
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
        if (!this.confirmationSubscription) {
            console.log(`waiting on confirmation for ${this.registrationEmail}`);
            this.confirmationSubscription = Observable.timer(2000, 2000).pipe(
                timeout(60 * 1000),
                flatMap(() => {
                    return this.server.hasEmailBeenConfirmed(this.registrationEmail);
                }),
                filter(confirmed => confirmed),
                take(1)
            ).subscribe(result => {
                // technically because of the pipe/filter above, this should never be false.
                if (result) {
                    this.logger.info(`Email was confirmed. Logging in the user.. (result: ${result})`);
                    this.login();
                }
            }, (err) => {
                this.pageUtils.showError(err);
            }, () => {
                this.logger.info('startListeningForConfirmation has completed');
            });
        } else {
            console.warn(`already have a confirmation listener, skipping`);
        }
    }

    private stopListeningForConfirmation() {
        if (this.confirmationSubscription) {
            this.confirmationSubscription.unsubscribe();
            this.confirmationSubscription = null;
        }
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