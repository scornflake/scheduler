import {forwardRef, Inject, Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, Observable, ReplaySubject, Subject} from 'rxjs';
import {EndpointsProvider} from "../endpoints/endpoints";
import {LoginResponse, RefreshResponse, ServerError} from "../../common/interfaces";
import {StateProvider} from "../state/state";
import {Logger, LoggingService} from "ionic-logging-service";
import {JwtHelperService} from '@auth0/angular-jwt';
import {isString} from "util";
import {SWBSafeJSON} from "../../common/json/safe-stringify";

export enum TokenStates {
    TokenOK,
    TokenInvalid,
    TokenWasRefreshed
}

@Injectable()
export class AuthorizationService {
    private logger: Logger;
    public tokenLifecycleSubject: Subject<TokenStates>;

    constructor(private httpClient: HttpClient,
                public state: StateProvider,
                private logService: LoggingService,
                @Inject(forwardRef(() => JwtHelperService)) private jwtHelp,
                private endpoints: EndpointsProvider) {

        this.logger = this.logService.getLogger(`service.auth`);
        this.tokenLifecycleSubject = new BehaviorSubject(TokenStates.TokenOK);
    }

    login(username: string, password: string): Observable<LoginResponse> {
        let url = this.endpoints.login(username, password);
        this.logger.info(`Calling ${url}`);
        const loginObservable = this.httpClient.get<LoginResponse>(url);

        const subject = new ReplaySubject<LoginResponse>(1);
        subject.subscribe((r: LoginResponse) => {
            console.log(`Got login response: ${SWBSafeJSON.stringify(r)}`);
            this.state.setLoginTokenFromLoginResponse(r.ok, r);
            this.notifyTokenRefreshed();
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
            this.notifyTokenRefreshed();
            return r;
        }, (err) => {
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

    isAuthenticatedAndNotExpired(nowOffsetInSeconds: number = 0): boolean {
        if (!this.state.isLoggedIn) {
            return false;
        }
        try {
            return !this.jwtHelp.isTokenExpired(this.state.loginToken, -nowOffsetInSeconds);
        } catch (err) {
            this.logger.warn("isAuthenticatedAndNotExpired", err);
            return false;
        }
    }


    private handleAuthenticationError(err: any) {
        // TODO: Only for authentication error codes
        this.logger.info(`Token authentication error: ${SWBSafeJSON.stringify(err)}.`);
        this.notifyTokenInvalid();
        this.state.setLoginTokenFromLoginResponse(false);
    }

    isTokenExpiryException(err: object): boolean {
        let result = false;
        if(err instanceof HttpErrorResponse || err instanceof ServerError) {
            let message = err instanceof ServerError ? err.allErrors : `${err.message} ${SWBSafeJSON.stringify(err.error)}`;
            // console.warn(`THE MESSAGE: ${message}`);
            if (err.status == 401 && message.indexOf('expired') != -1) {
                result = true;
            }
            if (err.status == 400 && message.indexOf('account is disabled') != -1) {
                result = true;
            }
        } else if (isString(err)) {
            result = err.indexOf('expired') != -1;
        }
        this.logger.error(`Check if ${err}/${err.constructor.name} means 'token expired': ${result}`);
        return result;
    }

    private notifyTokenRefreshed() {
        this.tokenLifecycleSubject.next(TokenStates.TokenWasRefreshed);
    }

    notifyTokenInvalid() {
        this.tokenLifecycleSubject.next(TokenStates.TokenInvalid);
    }

}