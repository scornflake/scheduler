import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../../scheduling/availability";
import {clamp} from "ionic-angular/util/util";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {action, computed, observable} from "mobx-angular";
import {ObservableMap, runInAction} from "mobx";

@Component({
    selector: 'availability-options',
    templateUrl: 'availability-options.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailabilityOptionsComponent implements OnInit {
    @observable _availability: Availability;
    @observable _state = new ObservableMap();
    @observable type: string;
    private logger: Logger;

    @Output() availabilityChange = new EventEmitter<Availability>();

    constructor() {
        this.logger = LoggingWrapper.getLogger('component.availability');
    }

    ngOnInit(): void {
        // this.
    }

    @computed get avail(): Availability {
        return this._availability;
    }

    get availability(): Availability {
        return this._availability;
    }

    @Input('availability')
    set availability(value: Availability) {
        runInAction(() => {
            this._availability = value;
            if (this._availability) {
                this.type = this._availability instanceof AvailabilityEveryNOfM ? "fraction" : "regular";
                if (this._availability.unit == AvailabilityUnit.AVAIL_ANYTIME) {
                    this.type = "anytime";
                }
                // this.logger.warn(`Type (after set of avail) now: ${this.type}`);
                let state = this.state;
                state['days'] = this._availability.period.toString();
                state['unit'] = this._availability.unit;
                if (this._availability instanceof AvailabilityEveryNOfM) {
                    state['weeks'] = this._availability.period_to_look_at.toString();
                }
            }
        });
    }

    @action setType(type: string) {
        this.type = type;
        this.build_availability();
    }

    @computed get state_key(): string {
        return this.type;
    }

    @computed get state() {
        let key = this.state_key;
        if (!this._state.hasOwnProperty(key)) {
            this._state[key] = new ObservableMap();
        }
        return this._state[key]
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
        if (!this.avail) {
            return []
        }
        let weeks = ["1", "2", "3", "4"];
        if (this.type == "fractional") {
            return weeks
        }

        if (this.avail.unit == AvailabilityUnit.EVERY_N_DAYS) {
            return ["1", "2", "3", "4", "5", "6", "7"]
        }
        return weeks
    }

    build_availability() {
        let days_number: number = parseInt(this.state['days']) || 2;
        this.logger.warn(`Type is ${this.type}`);
        if (this.type == "fraction") {
            // "this.unit" isn't used here
            let weeks_number: number = parseInt(this.state['weeks']) || 3;
            this.availability = new AvailabilityEveryNOfM(days_number, weeks_number)
        } else if (this.type == "regular") {
            let unit = this.state['unit'];
            if (!unit) unit = AvailabilityUnit.EVERY_N_DAYS;
            this.availability = new Availability(days_number, unit)
        } else {
            this.availability = new Availability();
        }
        // this.logger.info(`Changed avail to ${this.availability}`);
        this.availabilityChange.emit(this.avail);
    }
}
