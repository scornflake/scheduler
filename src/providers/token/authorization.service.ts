import {forwardRef, Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, ReplaySubject} from 'rxjs';
import {EndpointsProvider} from "../endpoints/endpoints";
import {LoginResponse, RefreshResponse, ServerError} from "../../common/interfaces";
import {StateProvider} from "../state/state";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {JwtHelperService} from '@auth0/angular-jwt';
import {isString} from "util";
import {SWBSafeJSON} from "../../common/json/safe-stringify";

@Injectable()
export class AuthorizationService {
    private logger: Logger;

    constructor(private httpClient: HttpClient,
                public state: StateProvider,
                @Inject(forwardRef(() => JwtHelperService)) private jwtHelp,
                private endpoints: EndpointsProvider) {

        this.logger = LoggingWrapper.getLogger(`service.auth`);
    }

    login(username: string, password: string): Observable<LoginResponse> {
        let url = this.endpoints.login(username, password);
        this.logger.info(`Calling ${url}`);
        const loginObservable = this.httpClient.get<LoginResponse>(url);

        const subject = new ReplaySubject<LoginResponse>(1);
        subject.subscribe((r: LoginResponse) => {
            console.log(`Got login response: ${SWBSafeJSON.stringify(r)}`);
            this.state.setLoginTokenFromLoginResponse(r.ok, r);
        }, (err) => {
            console.log(`Got error: ${SWBSafeJSON.stringify(err)}`);
            this.handleAuthenticationError(err);
        });

        loginObservable.subscribe(subject);
        return subject;
    }

    refresh(): Observable<RefreshResponse> {
        let url = this.endpoints.refreshToken();
        let body = {"token": this.state.loginToken};

        const refreshObservable = this.httpClient.post<RefreshResponse>(url, body);

        const refreshSubject = new ReplaySubject<RefreshResponse>(1);
        refreshSubject.subscribe((r: RefreshResponse) => {
            this.logger.info(`Token refreshed with: ${r.token}`);
            this.state.setLoginToken(r.token);
            return r;
        }, (err) => {
            this.logger.info(`Token failed to refresh with ${err}.`);
            this.handleAuthenticationError(err);
        });

        refreshObservable.subscribe(refreshSubject);
        return refreshSubject;
    }

    logout() {
        this.state.setLoginTokenFromLoginResponse(false);
    }

    isAuthenticated(): boolean {
        return this.state.isLoggedIn;
    }

    isAuthenticatedAndNotExpired(): boolean {
        if (!this.state.isLoggedIn) {
            return false;
        }
        return !this.jwtHelp.isTokenExpired(this.state.loginToken);
    }

    private handleAuthenticationError(err: any) {
        // TODO: Only for authentication error codes
        this.state.setLoginTokenFromLoginResponse(false);
    }

    isTokenExpiryException(err: any): boolean {
        let result = false;
        if (err instanceof ServerError) {
            result = err.status == 401 && err.message.indexOf('expired') != -1;
        } else if (isString(err)) {
            result = err.indexOf('expired') != -1;
        }
        this.logger.error(`Check if ${err} means 'token expired': ${result}`);
        return result;
    }
}