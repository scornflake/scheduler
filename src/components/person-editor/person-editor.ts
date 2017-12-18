import {Component, Input} from '@angular/core';
import includes from 'lodash/includes';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {UIStore} from "../../state/UIState";
import {RootStore} from "../../state/root";
import {computed} from "mobx-angular";
import {Person} from "../../state/people";

@Component({
    // changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'person-editor',
    templateUrl: 'person-editor.html'
})
export class PersonEditorComponent {
    constructor(private store: RootStore) {
    }

    @computed
    get schedule(): ScheduleWithRules {
        return this.store.schedule;
    }

    @computed
    get ui(): UIStore {
        return this.store.ui_store;
    }

    @computed
    get person(): Person {
        return this.store.ui_store.selected_person;
    }

    scheduled_dates() {
        // Find a list of schedules for this person
        return Array.from(this.schedule.dates.values()).filter(v => {
            return includes(v.people, this.ui.selected_person);
        });
    }
}
