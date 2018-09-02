import {AfterContentInit, AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides} from 'ionic-angular';
import {AbstractControl, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {action, observable} from "mobx-angular";
import {RESTServer} from "../../providers/server/server";
import {Logger, LoggingService} from "ionic-logging-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {PageUtils} from "../page-utils";
import {ServerError} from "../../common/interfaces";
import {Observable, Subscription} from "rxjs";
import {filter, flatMap, take, timeout} from "rxjs/operators";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";

/*

So I was going to do this in app.
I got up to the point of setting the pwd, and realized to do it securely I need a time limited one-use token.
At this point, I decided - nah, lets just leave this all to Django.

I've left this form in place, because it *might* be useful in future.
It's NOT included in the AppModule

 */

@IonicPage({
    name: 'page-forgot-password',
    segment: 'forgot',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-forgot-password',
    templateUrl: 'forgot-password.html',
})
export class ForgotPasswordPage implements OnInit, AfterViewInit, AfterContentInit, OnDestroy {
    @observable registrationEmail: string;
    @observable private password1: string;
    @observable private password2: string;
    @observable thinking: boolean = false;

    form: FormGroup;
    pwdForm: FormGroup;

    private logger: Logger;
    @ViewChild(Slides) slides: Slides;

    private confirmationSubscription: Subscription;

    constructor(public navCtrl: NavController,
                public restAPI: RESTServer,
                public logSvr: LoggingService,
                public pageUtils: PageUtils,
                public server: SchedulerServer,
                public formBuilder: FormBuilder,
                public navParams: NavParams) {
        this.logger = this.logSvr.getLogger('page.forgot');
        let suppliedEmail = navParams.get('email');
        if (suppliedEmail) {
            this.setRegistrationEmail(suppliedEmail);
        }

        setTimeout(() => {
            this.setRegistrationEmail('neil@cloudnine.net.nz');
            this.switchToChangePassword();
        }, 300)
    }

    ngOnInit() {
        this.form = this.formBuilder.group({
            'email': ["",
                [Validators.email],
            ],
        });
    }

    ngAfterViewInit() {
    }

    ngAfterContentInit() {
    }

    ngOnDestroy() {
        this.stopListeningForConfirmation();
        this.cancelWaitingForConfirmation();
    }

    @action setRegistrationEmail(value: string) {
        this.registrationEmail = value;
    }

    goBackToLogin() {
        this.navCtrl.pop();
    }

    @action notThinking() {
        this.thinking = false;
    }

    @action theyForgot() {
        this.thinking = true;

        try {
            this.restAPI.forgotPassword(this.registrationEmail).then(resp => {
                this.logger.info(`Response: ${SWBSafeJSON.stringify(resp)}`);
                this.pageUtils.slideTo(this.slides, 1, () => {
                    this.startListeningForConfirmation();
                });
                this.notThinking();
            }, (err) => {
                this.logger.info(`Got: ${err.constructor.name}`);
                this.notThinking();
                if (err instanceof ServerError) {
                    if (err.status == 404) {
                        this.pageUtils.showError('User not found');
                        return;
                    }
                }
                this.pageUtils.showError(err);
            });
        } catch (e) {
            this.pageUtils.showError(e);
            this.notThinking();
        }
    }

    private startListeningForConfirmation() {
        if (!this.confirmationSubscription) {
            console.log(`waiting on confirmation for ${this.registrationEmail}`);
            this.confirmationSubscription = Observable.timer(2000, 2000).pipe(
                timeout(120 * 1000),
                flatMap(() => {
                    return this.server.hasResetEmailBeenConfirmed(this.registrationEmail);
                }),
                filter(confirmed => confirmed),
                take(1)
            ).subscribe(result => {
                // technically because of the pipe/filter above, this should never be false.
                if (result) {
                    this.switchToChangePassword();
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

    cancelWaitingForConfirmation() {
        this.notThinking();
        this.stopListeningForConfirmation();
        this.pageUtils.slideTo(this.slides, 0, () => {
        });
    }

    private switchToChangePassword() {
        this.pwdForm = this.formBuilder.group({
            'password1': ["",
                [
                    Validators.minLength(8),
                    // this.passwordsMustMatch.bind(this)
                ],
            ],
            'password2': ["",
                [
                    this.passwordsMustMatch.bind(this)
                ],
            ],
        });
        this.logger.info(`Email reset confirmed.`);
        this.pageUtils.slideTo(this.slides, 2, () => {
            this.logger.info(`Reset pwd`);
        })
    }

    @action setPassword2(value: string) {
        this.password2 = value;
    }

    @action setPassword1(value: string) {
        this.password1 = value;
    }

    passwordsMustMatch(control: AbstractControl) {
        // hmm. wonder how I get NG to NOT create an observable every time?
        // console.warn(`creating a new control observable`);
        this.logger.debug(`pwd1: ${this.password1}, pwd2: ${this.password2}`);
        let ok = this.password1 == this.password2;
        if (!ok) {
            this.logger.warn(`Passwords dont match`);
            return {mustMatch: true};
        }
        this.logger.debug(`this.password1 == this.password2`);
        return null;
    }

    setNewPassword() {
        // Set the PWD!
        // This should be done securely. At this point, I decided - nah, lets just leave this all to Django.
        // I've left this form in place, because it *might* be useful in future.
    }
}
