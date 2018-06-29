import {Injectable, NgZone, OnDestroy} from "@angular/core";
import {Platform} from "ionic-angular";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Subject} from "rxjs/Subject";
import {LoggingWrapper} from "../logging-wrapper";
import {Logger} from "ionic-logging-service";
import {Subscription} from "rxjs/Subscription";
import {SWBSafeJSON} from "../json/safe-stringify";
import {Observable} from "rxjs/Observable";
import {distinctUntilChanged, map} from "rxjs/operators";
import {Network} from "@ionic-native/network";
import {computed, observable} from "mobx-angular";
import {runInAction} from "mobx";

@Injectable()
class ConnectivityService implements OnDestroy {
    private networkSubject: Subject<boolean>;
    private logger: Logger;
    private connectionSubscription: Subscription;
    private disconnectionSubscription: Subscription;

    @observable private _navigatorOnline: boolean;
    @observable private _overrideEnabled: boolean;

    constructor(private platform: Platform, private network: Network, private zone: NgZone) {
        this.networkSubject = new BehaviorSubject<boolean>(false);
        this.logger = LoggingWrapper.getLogger('network');

        if (!this.onBrowser) {
            this.connectionSubscription = this.network.onConnect().subscribe(() => {
                this.logger.info(`Network Connected`);
                this.networkSubject.next(true);
            });
            this.disconnectionSubscription = this.network.onDisconnect().subscribe(() => {
                this.logger.info(`Network Disconnected`);
                this.networkSubject.next(false);
            });
            this.network.onchange().subscribe(change => {
                this.logger.info(`Network changed: ${SWBSafeJSON.stringify(change)}`)
            });
        } else {
            // If running in browser, poll the flag on the navigator
            this.connectionSubscription = Observable.timer(200, 1000).pipe(
                map(() => {
                    return window.navigator.onLine;
                }),
                distinctUntilChanged()
            ).subscribe((value) => {
                runInAction(() => {
                    this._navigatorOnline = value;
                });
                this.zone.run(() => {
                    this.sendNetworkChange();
                });
            })
        }
    }

    ngOnDestroy() {
        if (this.disconnectionSubscription) {
            this.disconnectionSubscription.unsubscribe();
        }
        if (this.connectionSubscription) {
            this.connectionSubscription.unsubscribe();
        }
    }

    @computed get overrideEnabled(): boolean {
        return this._overrideEnabled;
    }

    set overrideEnabled(value: boolean) {
        runInAction(() => {
            this._overrideEnabled = value;
        });
        this.logger.info(`'Online' override active: ${this._overrideEnabled}`);
        this.sendNetworkChange();
    }

    private sendNetworkChange() {
        let value = this.isOnline;
        // this.logger.warn(`Online: ${value} - sending this to the network$`);
        this.networkSubject.next(value);
    }

    get networkType(): string {
        if (this.onBrowser) {
            return "browser";
        }
        return this.network.type;
    }

    @computed get isOnline(): boolean {
        if (this.overrideEnabled) {
            this.logger.info(`Online override active, return false for 'online'`);
            return false;
        }

        if (this.onBrowser) {
            // can't use network I don't think?
            return this._navigatorOnline;
        }
        return this.networkType !== 'unknown' && this.networkType != 'none';
    }

    get onDevice(): boolean {
        return this.platform.is('cordova');
    }

    get onBrowser(): boolean {
        return !this.onDevice;
    }

    get network$(): Observable<boolean> {
        return this.networkSubject;
    }

    get platforms(): string {
        return this.platform.platforms().join(", ");
    }
}


export {
    ConnectivityService
}