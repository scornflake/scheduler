import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output
} from '@angular/core';
import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../../scheduling/availability";
import {clamp} from "ionic-angular/util/util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {action, computed, observable} from "mobx-angular";
import {autorun, ObservableMap, runInAction} from "mobx";
import {Person} from "../../scheduling/people";

@Component({
    selector: 'availability-options',
    templateUrl: 'availability-options.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityOptionsComponent implements OnInit {
    @observable _state = new ObservableMap();
    @observable type: string;

    @Input('person')
    set person(p: Person) {
        runInAction(() => {
            this._person = p;

            autorun(() => {
                this.logger.info(`Building new state from availability: ${p.availability}`);
                this.updateInternalStateUsingAvailability(p.availability);
            })
        });
    }

    private logger: Logger;
    @observable private _person: Person;

    @Output() availabilityChange = new EventEmitter<Availability>();

    constructor(private cf: ChangeDetectorRef) {
        this.logger = LoggingWrapper.getLogger('component.availability');
        this._state['anytime'] = new ObservableMap();
        this._state['regular'] = new ObservableMap();
        this._state['fraction'] = new ObservableMap();
    }

    ngOnInit(): void {
    }

    @action setType(type: string) {
        this.type = type;
        this.buildNewAvailability();
    }

    @computed get state() {
        return this._state[this.type];
    }

    @computed get is_regular(): boolean {
        return this.type == "regular";
    }

    @computed get days(): string {
        return this.state['days'];
    }

    set days(value: string) {
        let state = this.state;
        state['days'] = value;

        let days_number = parseInt(state['days']);
        let weeks_number = parseInt(state['weeks']);
        if (!this.is_regular) {
            // Weeks must be at least days. Can't do 3 of 2, for example.
            let valid_weeks = Math.max(weeks_number, days_number);
            state['weeks'] = clamp(1, valid_weeks, 4).toString();
        }
    }

    @computed get weeks(): string {
        return this.state['weeks']
    }

    set weeks(value: string) {
        let state = this.state;
        state['weeks'] = value;
        let days_number = parseInt(state['days']);
        let weeks_number = parseInt(state['weeks']);
        if (!this.is_regular) {
            // Days must be <= weeks. Can't do 3 in 2 for example.
            let valid_days = Math.min(days_number, weeks_number);
            valid_days = clamp(1, valid_days, 4);
            state['days'] = valid_days.toString()
        }
    }

    @computed get regular_days_options() {
        if (!this._person || !this._person.availability) {
            return []
        }
        let weeks = ["1", "2", "3", "4"];
        if (this.type == "fractional") {
            return weeks
        }

        if (this._person.availability.unit == AvailabilityUnit.EVERY_N_DAYS) {
            return ["1", "2", "3", "4", "5", "6", "7"]
        }
        return weeks
    }

    buildNewAvailability() {
        let days_number: number = parseInt(this.state['days']) || 2;
        this.logger.warn(`Type is ${this.type}`);
        let newAvail = null;
        if (this.type == "fraction") {
            // "this.unit" isn't used here
            let weeks_number: number = parseInt(this.state['weeks']) || 3;
            newAvail = new AvailabilityEveryNOfM(days_number, weeks_number)
        } else if (this.type == "regular") {
            let unit = this.state['unit'];
            if (!unit) unit = AvailabilityUnit.EVERY_N_DAYS;
            newAvail = new Availability(days_number, unit)
        } else {
            newAvail = new Availability();
        }
        // this.logger.info(`Changed avail to ${this.availability}`);
        this.availabilityChange.emit(newAvail);
    }

    @action
    private updateInternalStateUsingAvailability(avail) {
        if (avail) {
            this.type = avail instanceof AvailabilityEveryNOfM ? "fraction" : "regular";
            if (avail.unit == AvailabilityUnit.AVAIL_ANYTIME) {
                this.type = "anytime";
            }
            // this.logger.warn(`Type (after set of avail) now: ${this.type}`);
            let state = this.state;
            state['days'] = avail.period.toString();
            state['unit'] = avail.unit;
            if (avail instanceof AvailabilityEveryNOfM) {
                state['weeks'] = avail.period_to_look_at.toString();
            }
        }
    }
}
