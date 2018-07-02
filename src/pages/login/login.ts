import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {AlertController, IonicPage, Loading, LoadingController, NavController, NavParams, Slides} from 'ionic-angular';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators} from "@angular/forms";
import "rxjs/add/operator/debounceTime";
import {Logger, LoggingService} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {PageUtils} from "../page-utils";
import {action, observable} from "mobx-angular";
import {catchError, debounceTime, filter, flatMap, map, take, timeout} from "rxjs/operators";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import {ServerError} from "../../common/interfaces";
import "rxjs/add/observable/timer";
import {Organization} from "../../scheduling/organization";
import {isUndefined} from "util";

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

                // // do a login for this user
                // this.server.loginUser(this.registrationEmail, this.registrationPassword).then(lr => {
                //     if (lr.ok) {
                //         this.switchToReplication();
                //         // this.register();
                //     } else {
                //         console.error(`Arg: ${JSON.stringify(lr)}`);
                //     }
                // });


            }, 250)
        }
    }

    ngAfterViewInit(): void {
        this.firstSwitch = true;
        if (this.isCreateAccount) {
            this.switchToCreate();
        } else {
            this.switchToLogin();
        }
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

        this.logger.info(`Starting login with ${username}`);
        this.server.loginUser(username, password).then(({user, ok, detail}) => {
            this.logger.info(`Login completed ${ok}: ${detail}`);
            if (!ok) {
                this.showError(detail);
            } else {
                // If it's good, we start the lifecycle.
                // That'll load all the data and kick us back to home
                this.pageUtils.runStartupLifecycleAfterLogin(this.nav);

                // OLD OLD
                // // Using this rather that this.nav.pop(), so it works
                // // when the page is hit directly as a deep link
                // this.nav.setRoot('home')
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
        }

        if (typeof(error) === 'object') {
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
            this.slides.slideTo(mode);
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
        if (!this.confirmationListener) {
            this.confirmationListener = Observable.timer(2000, 2000);
            console.log(`waiting on confirmation for ${this.registrationEmail}`);
            this.confirmationSubscription = this.confirmationListener.subscribe(() => {
                this.server.hasEmailBeenConfirmed(this.registrationEmail).then(flag => {
                    if (flag) {
                        this.logger.info(`Email was confirmed. Wait for replication to start`);
                        this.switchToReplication();
                    }
                })
            })
        } else {
            console.warn(`already have a confirmation listener, skipping`);
        }
    }

    private switchToReplication() {
        this.stopListeningForConfirmation();
        this.switchModes(LoginPageMode.StartingReplication);

        // Basically we're waiting to see if we can see ourselves + our organization in
        // the local DB... if we can find both, and replication is started
        // then we continue

        this.pageUtils.runStartupLifecycle(this.nav);

        console.log(`checking local DB for what we need ...`);

        let checker = Observable.timer(1000, 1000)
            .pipe(
                map(() => this.server.db),
                filter(db => db != null),
                flatMap(() => {
                    this.logger.info(`looking up ${this.registrationEmail}...`);
                    return this.server.db_findPersonByEmail(this.registrationEmail)
                }),
                filter(person => {
                    if (!person) {
                        this.logger.info(`waiting for person with email: ${this.registrationEmail}`);
                        return false;
                    }

                    if (!person.organization) {
                        this.logger.info(`waiting for person to have an organization`);
                        return false;
                    }

                    if (!person.organization.uuid) {
                        this.logger.info(`waiting for person to have an organization WITH a UUID`);
                        return false;
                    }
                    return true;
                }),
                flatMap(person => this.server.db_findByUUID(person.organization.uuid)),
                filter(org => org != null),
                timeout(10000),
                take(1),
                catchError(err => {
                    throw new Error(`Could not find ${this.registrationEmail} within 10s`);
                })
            );

        this.confirmationSubscription = checker.subscribe(
            (org: Organization) => {
                this.logger.debug(`I have got a person, and org! ${org.name}`)
            },
            err => {
                this.pageUtils.showError(err, true);
                this.confirmationSubscription.unsubscribe();
                this.popBackHome();
            },
            () => {
                this.switchToReadyToUse();
            }
        );
    }

    private switchToReadyToUse() {
        this.stopListeningForConfirmation();
        this.switchModes(LoginPageMode.ReadyToGo);
    }

    private stopListeningForConfirmation() {
        if (this.confirmationSubscription) {
            this.confirmationSubscription.unsubscribe();
            this.confirmationSubscription = null;
        }

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