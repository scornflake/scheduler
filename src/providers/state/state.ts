import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {action, computed, observable} from "mobx-angular";
import {LoginResponse} from "../../common/interfaces";
import {Logger, LoggingService} from "ionic-logging-service";
import {reaction, runInAction} from "mobx";
import {Storage} from "@ionic/storage";
import {ConnectivityService} from "../../common/network/connectivity";
import {isDefined} from "ionic-angular/util/util";
import {IState} from "./state.interface";

const STATE_ROOT = 'state';

export function loadStateAsPromise(state: StateProvider) {
    return () => state.asyncLoadState();
}

@Injectable()
export class StateProvider {
    @observable private _state: IState;
    private _previousState: IState;
    private logger: Logger;

    constructor(public http: HttpClient,
                public logService: LoggingService,
                private connectivity: ConnectivityService,
                private storage: Storage) {
        this.logger = logService.getLogger('service.state');
    }

    async asyncLoadState(): Promise<object> {
        if (this._state == null) {
            this.logger.info(`Loading state because _state is null...`);
            let newState = await this.storage.get(STATE_ROOT) || {
                lastPersonUUID: null,
                lastOrganizationUUID: null,
                loginToken: null,
                isForcedOffline: false,
            };

            runInAction(() => {
                this._state = newState;
                this.logger.info(`Set state to: ${JSON.stringify(this._state)}`);
            });

            // this.logger.debug(`Loading state... ${JSON.stringify(this._state)}`);

            // Restore current state to the object
            this.connectivity.setOverrideEnabled(this.state.isForcedOffline);

            // Listen to the connectivity service. If the flag to force it changes, save that here.
            reaction(() => {
                return this.connectivity.overrideEnabled;
            }, (value) => {
                this._state.isForcedOffline = value;
                this.asyncSaveState().then(() => {
                    this.logger.debug(`Saved state because 'forced' flag changed`);
                });
            });
        }
        return this.state;
    }

    async asyncSaveState() {
        await this.storage.set(STATE_ROOT, this._state);
    }

    hasStateChangedSinceLastLifecycleRun(): boolean {
        let areSet = isDefined(this._previousState) && isDefined(this._state);
        if (areSet) {
            // Only want to compare some fields, not all
            let orgSame = this._state.lastOrganizationUUID == this._previousState.lastOrganizationUUID;
            let personSame = this._state.lastPersonUUID == this._previousState.lastPersonUUID;
            let tokenSame = this._state.loginToken == this._previousState.loginToken;
            if (orgSame && personSame && tokenSame) {
                return false;
            }
        }
        return true;
    }

    captureStateAsPrevious() {
        this._previousState = Object.assign({}, this._state);
    }

    get loginToken(): string {
        if(this.state) {
            return this.state.loginToken;
        }
        return null;
    }

    @action setLoginToken(token: string) {
        this.state.loginToken = token;
    }

    get state(): IState {
        return this._state;
    }

    @computed get isLoggedIn(): boolean {
        // atm: this is cleared if a validate login gets 'bad'
        // TODO: Adjust for true offline case.
        return this.loginToken != null;
    }

    logout() {
        this.state.lastOrganizationUUID = null;
        this.state.lastPersonUUID = null;
        this._previousState = undefined;
    }

    clearTokens() {
        this.state.loginToken = null;
    }

    @action setLoginTokenFromLoginResponse(good: boolean, lr: LoginResponse = null) {
        if (good) {
            let ur = lr.user;
            if(!ur) {
                throw new Error('No user returned from login response');
            }
            this.logger.info("setLoginTokenFromLoginResponse", `Set login token to ${lr.token || ''}, last person to: ${ur.uuid || ''}`);
            this.state.loginToken = lr.token;
            this.state.lastPersonUUID = ur.uuid;
            this.state.lastOrganizationUUID = ur.organization_uuid;
        } else {
            this.state.loginToken = null;
            this.state.lastPersonUUID = null;
            this.state.lastOrganizationUUID = null;
            this.logger.info("setLoginTokenFromLoginResponse", `Clearing state token/uuid because good == false`);
        }
    }
}

