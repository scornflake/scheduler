import {Component} from '@angular/core';
import {SavingState, SchedulerDatabase} from "../../providers/server/db";
import {Observable} from "rxjs/Observable";

@Component({
    selector: 'saving-state',
    templateUrl: 'saving-state.html'
})
export class SavingStateComponent {
    savingstate: string = "idle";

    constructor(db: SchedulerDatabase) {
        db.save_notifications.subscribe(state => {
            if (state == SavingState.ChangeDetected) {
                this.savingstate = "changed";
            } else if (state == SavingState.StartedSaving) {
                this.savingstate = "saving";
            } else if (state == SavingState.FinishedSaving) {
                this.savingstate = "done";
                Observable.interval(1000).take(1).subscribe(() => {
                    this.savingstate = "idle";
                })
            }
        });
    }
}
