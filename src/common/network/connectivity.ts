import {Injectable, NgZone, OnDestroy} from "@angular/core";
import {Platform} from "ionic-angular";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Subject} from "rxjs/Subject";
import {Logger, LoggingService} from "ionic-logging-service";
import {Subscription} from "rxjs/Subscription";
import {SWBSafeJSON} from "../json/safe-stringify";
import {Observable} from "rxjs/Observable";
import {distinctUntilChanged, map} from "rxjs/operators";
import {Network} from "@ionic-native/network";
import {action, computed, observable} from "mobx-angular";
import {runInAction} from "mobx";
import {from} from "../../../node_modules/rxjs/observable/from";

@Injectable()
class ConnectivityService implements OnDestroy {
    private networkSubject: Subject<boolean>;
    private logger: Logger;
    private connectionSubscription: Subscription;
    private disconnectionSubscription: Subscription;

    @observable private _navigatorOnline: boolean = true;
    @observable private _overrideEnabled: boolean = false;

    constructor(private platform: Platform,
                private network: Network,
                private logService: LoggingService,
                private zone: NgZone) {
        this.networkSubject = new BehaviorSubject<boolean>(true);
        this.logger = this.logService.getLogger('network');

        this.platform.ready().then(() => {
            if (this.onDevice && this.network) {
                this.connectionSubscription = this.network.onConnect().subscribe(() => {
                    this.logger.info(`Network Connected`);
                    this.sendNetworkChange();
                });
                this.disconnectionSubscription = this.network.onDisconnect().subscribe(() => {
                    this.logger.info(`Network Disconnected`);
                    this.sendNetworkChange();
                });
                this.network.onchange().subscribe(change => {
                    this.logger.info(`Network changed: ${SWBSafeJSON.stringify(change)}`);
                    this.sendNetworkChange();
                });
            } else {
                // If running in browser, poll the flag on the navigator
                this.zone.runOutsideAngular(() => {
                    this.connectionSubscription = Observable.timer(200, 1000).pipe(
                        map(() => {
                            return window.navigator.onLine;
                        }),
                        distinctUntilChanged()
                    ).subscribe((value) => {
                        runInAction(() => {
                            this._navigatorOnline = value;
                            this.zone.run(() => {
                                this.sendNetworkChange();
                            });
                        });
                    })
                });
            }
        });
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

    @action setOverrideEnabled(value: boolean) {
        this._overrideEnabled = value;
        this.logger.debug(`'Online' override active: ${this._overrideEnabled}`);
        this.sendNetworkChange();
    }

    private sendNetworkChange() {
        let value = this.isOnline;
        this.logger.debug(`Online: ${value} - sending this to the network$`);
        this.networkSubject.next(value);
    }

    get networkType(): string {
        if (this.onBrowser) {
            return "browser";
        }
        if (this.network != null) {
            return this.network.type;
        }
        return "unknown";
    }

    @computed get isOnline(): boolean {
        if (this.overrideEnabled) {
            this.logger.debug(`Online override active, return false for 'online'`);
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

    get onBrowser$(): Observable<boolean> {
        return from(this.platform.ready().then(() => !this.onDevice));
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