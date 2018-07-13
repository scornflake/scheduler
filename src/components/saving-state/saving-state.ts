import {AfterViewInit, Component, Input, OnDestroy} from '@angular/core';
import {SavingState, SchedulerDatabase} from "../../providers/server/db";
import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {take} from "rxjs/operators";
import {observable} from "mobx-angular";
import {runInAction} from "mobx";

@Component({
    selector: 'saving-state',
    templateUrl: 'saving-state.html',
})
export class SavingStateComponent implements AfterViewInit, OnDestroy {

    @observable savingstate: string = "idle";

    private db: SchedulerDatabase;
    private dbSubscription: Subscription;

    constructor(private server: SchedulerServer) {

    }

    ngOnDestroy() {
        if (this.dbSubscription) {
            this.dbSubscription.unsubscribe();
            this.dbSubscription = null;
        }
    }

    ngAfterViewInit() {
        this.dbSubscription = this.server.db$.subscribe(db => {
            this.db = db;
            if (this.db) {
                this.dbSubscription = this.db.saveNotifications$.subscribe(state => {
                    runInAction(() => {
                        if (state == SavingState.ChangeDetected) {
                            this.savingstate = "changed";
                        } else if (state == SavingState.StartedSaving) {
                            this.savingstate = "saving";
                        } else if (state == SavingState.FinishedSaving) {
                            this.savingstate = "done";
                            let subscription = Observable.interval(1000).pipe(
                                take(1)
                            ).subscribe(() => {
                                runInAction(() => {
                                    this.savingstate = "idle";
                                    subscription.unsubscribe();
                                });
                            })
                        }
                    })
                });
            }
        });
    }
}
