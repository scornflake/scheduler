import {Injectable} from "@angular/core";
import {Platform} from "ionic-angular";
import {Network} from '@ionic-native/network';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Subject} from "rxjs/Subject";
import {LoggingWrapper} from "../logging-wrapper";
import {Logger} from "ionic-logging-service";

@Injectable()
class NetworkUtils {
    private connected: boolean;
    private networkSubject: Subject<boolean>;
    private logger: Logger;

    constructor(private platform: Platform, private network: Network) {
        this.networkSubject = new BehaviorSubject<boolean>(false);
        this.logger = LoggingWrapper.getLogger('network');

        if (this.network) {
            this.network.onConnect().subscribe(() => {
                this.logger.info(`Network Connected`);
                this.connected = true;
                this.networkSubject.next(true);
            });
            this.network.onDisconnect().subscribe(() => {
                this.logger.info(`Network Disconnected`);
                this.connected = false;
                this.networkSubject.next(false);
            });
            // this.network.onchange().subscribe(change => {
            //     this.logger.info(`Network changed: ${SafeJSON.stringify(change)}`)
            // })
        }
    }

    get networkType(): string {
        return this.network.type;
    }

    get isOnline(): boolean {
        if (this.isBrowser) {
            // can't use network I don't think?
        }
        return this.connected;
    }

    get haveCordova(): boolean {
        return this.platform.platforms().indexOf('cordova') != -1;
    }

    get isBrowser(): boolean {
        return this.haveCordova == false;
    }

    get platforms(): string {
        return this.platform.platforms().join(", ");
    }
}


export {
    NetworkUtils
}