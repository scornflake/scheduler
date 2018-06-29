import {Component} from '@angular/core';
import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {PageUtils} from "../page-utils";
import {ConnectivityService} from "../../common/network/connectivity";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {ReplicationStatus} from "../../providers/server/db";

@IonicPage({
    name: 'page-test-utils',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-test-utils',
    templateUrl: 'test-utils.html',
})
export class TestUtilsPage {

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public schedulerServer: SchedulerServer,
                public netUtil: ConnectivityService,
                public pageUtils: PageUtils,
                public navParams: NavParams) {
    }


    ionViewDidLoad() {
    }

    ngOnInit() {
        // If no DB, kick page utils?
        this.pageUtils.runStartupLifecycle(this.navCtrl);
    }

    textForReplicationStatus(param: ReplicationStatus) {
        switch (param) {
            case ReplicationStatus.Paused:
                return 'paused';
            case ReplicationStatus.Idle:
                return 'idle';
            case ReplicationStatus.ProcessingPull:
                return 'processing';
            case ReplicationStatus.Unknown:
                return 'unknown';
        }
    }
}
