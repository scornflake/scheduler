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
import {SWBSafeJSON} from "../../common/json/safe-stringify";

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
                this.decodeToken();
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
        if (this.state) {
            return this.state.loginToken;
        }
        return null;
    }

    @action setLoginToken(token: string, decodedToken: any = null) {
        this.state.loginToken = token;
        this.state.decodedToken = decodedToken;
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
        this.state.decodedToken = null;
    }

    @action setLoginTokenFromLoginResponse(good: boolean, lr: LoginResponse = null) {
        if (good) {
            let ur = lr.user;
            if (!ur) {
                throw new Error('No user returned from login response');
            }
            this.logger.info("setLoginTokenFromLoginResponse", `Set login token to ${lr.token || ''}, last person to: ${ur.uuid || ''}`);
            this.state.loginToken = lr.token;
            this.state.lastPersonUUID = ur.uuid;
            this.state.lastOrganizationUUID = ur.organization_uuid;
            this.decodeToken();
        } else {
            this.state.loginToken = null;
            this.state.decodedToken = null;
            this.state.lastPersonUUID = null;
            this.state.lastOrganizationUUID = null;
            this.logger.info("setLoginTokenFromLoginResponse", `Clearing state token/uuid because good == false`);
        }
    }

    private static urlBase64Decode(str) {
        var output = str.replace(/-/g, '+').replace(/_/g, '/');
        switch (output.length % 4) {
            case 0: {
                break;
            }
            case 2: {
                output += '==';
                break;
            }
            case 3: {
                output += '=';
                break;
            }
            default: {
                throw 'Illegal base64url string!';
            }
        }
        return StateProvider.b64DecodeUnicode(output);
    };

    private static b64decode(str) {
        // credits for decoder goes to https://github.com/atk
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var output = '';
        str = String(str).replace(/=+$/, '');
        if (str.length % 4 === 1) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        for (
            // initialize result and counters
            var bc = 0, bs = void 0, buffer = void 0, idx = 0;
            // get next character
            (buffer = str.charAt(idx++));
            // character found in table? initialize bit storage and add its ascii value;
            ~buffer &&
            ((bs = bc % 4 ? bs * 64 + buffer : buffer),
                // and if not first of each 4 characters,
                // convert the first 8 bits to one ascii character
            bc++ % 4)
                ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
                : 0) {
            // try to find character in table (0-63, not found => -1)
            buffer = chars.indexOf(buffer);
        }
        return output;
    };

    private static b64DecodeUnicode(str) {
        return decodeURIComponent(Array.prototype.map
            .call(StateProvider.b64decode(str), function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join(''));
    };


    private decodeToken() {
        if (this.loginToken) {
            this.state.decodedToken = StateProvider.decodeJWTToken(this.loginToken);
            this.logger.debug(`JWT token decoded to: ${SWBSafeJSON.stringify(this.state.decodedToken)}`)
        } else {
            this.logger.warn(`No JWT token. No decoding performed.`);
            this.state.decodedToken = null;
        }
    }

    static decodeJWTToken(token: string) {
        var parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('The inspected token doesn\'t appear to be a JWT. Check to make sure it has three parts. decodeToken() error.');
        }
        var decoded = StateProvider.urlBase64Decode(parts[1]);
        if (!decoded) {
            throw new Error('Cannot decode the token.');
        }
        return JSON.parse(decoded);
    }
}

