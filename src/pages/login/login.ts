import {Component} from '@angular/core';
import {AlertController, IonicPage, Loading, LoadingController, NavController} from 'ionic-angular';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ServerProvider} from "../../providers/server/server";
import {isDefined} from "ionic-angular/util/util";
import {Subject} from "rxjs/Subject";
import "rxjs/add/operator/debounceTime";
import {Logger, LoggingService} from "ionic-logging-service";
import {SafeJSON} from "../../common/json/safe-stringify";

class AbstractLoginPage {
    loginForm: FormGroup;
    loading: Loading;

    username_usability: string;
    registration_password: string;
    registration_error: string;

    private _registration_username: string;
    private username_checker: Subject<any>;
    private logger: Logger;

    constructor(protected nav: NavController,
                protected alertCtrl: AlertController,
                protected logService: LoggingService,
                protected server: ServerProvider,
                protected loadingCtrl: LoadingController) {
        this.registration_error = "";
        this.logger = this.logService.getLogger("page.login.abstract");

        this.username_checker = new Subject();
        this.username_checker.debounceTime(500).subscribe(v => {
            this.check_username()
        });
    }

    get registration_username(): string {
        return this._registration_username;
    }

    set_registration_username(value: string) {
        this._registration_username = value;
        if (this.registration_error) {
            this.registration_error = "";
        }
        this.username_checker.next(value)
    }

    private async check_username() {
        let username = this._registration_username;
        this.logger.info(`Checking that ${username} is ok...`);
        if (isDefined(username)) {
            try {
                this.username_usability = await this.server.isUsernameAvailableAndGood(username).toPromise();
            } catch (e) {
                this.registration_error = SafeJSON.stringify(e);
                console.log(e);
            }
        }
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

    showError(text) {
        this.loading.dismiss();

        let alert = this.alertCtrl.create({
            title: 'Opps!',
            subTitle: text,
            buttons: ['OK']
        });
        alert.present(prompt);
    }

    // setupTestUser(users: IPersonStore, deleteUser = false): any {
    //     try {
    //         users.clearRegistrationState();
    //         users.setRegistrationUsername("neil@cloudnine.net.nz");
    //         users.setRegistrationPassword("testing59");
    //         if (deleteUser) {
    //             users.deletePerson("neil@cloudnine.net.nz");
    //         }
    //     } catch (error) {
    //         console.log(error);
    //     }
    // }
}

@IonicPage({
    defaultHistory: ['home'],
    name: 'login'
})
@Component({
    selector: 'page-login',
    templateUrl: 'login.html',
})
export class LoginPage extends AbstractLoginPage {
    constructor(protected nav: NavController,
                protected alert: AlertController,
                protected logService: LoggingService,
                protected server: ServerProvider,
                loading: LoadingController,
                private formBuilder: FormBuilder) {
        super(nav, alert, logService, server, loading);
        this.loginForm = this.formBuilder.group({
            'email': ["", [Validators.email, Validators.required]],
            'password': ["", [Validators.required, Validators.minLength(8)]],
        });
    }

    ngAfterViewInit() {
        // For debug/testing
        // this.createAccount();
        // this.setupTestUser(this.store.s.users);
    }

    public createAccount() {
        // this.nav.push('RegisterPage');
    }

    public login() {
        this.showLoading();
        let username = this.registration_username;

        // let password = this.registration_password;
        let password = this.loginForm.get('password').value;
        console.log(`Starting login... using ${username} and ${password}`);
        this.server.loginUser(username, password).subscribe(({user, ok, detail}) => {
            console.log(`Login completed ${ok}: ${detail}`);
            if (!ok) {
                this.showError(detail);
            } else {
                // Using this rather that this.nav.pop(), so it works
                // when the page is hit directly as a deep link
                this.nav.setRoot('home')
            }
        }, (error) => {
            console.error(error);
            this.showError(error);
        });
    }

}

export {
    AbstractLoginPage
}