import {Component} from '@angular/core';
import includes from 'lodash/includes';
import {ScheduleWithRules} from "../../scheduling/rule_based/scheduler";
import {computed} from "mobx-angular";
import {Person} from "../../scheduling/people";
import {RootStore} from "../../store/root";
import {UIStore} from "../../store/UIState";

@Component({
    selector: 'person-editor',
    templateUrl: 'person-editor.html'
})
export class PersonEditorComponent {
    constructor(private store: RootStore) {
    }

    @computed
    get schedule(): ScheduleWithRules {
        return this.store.organization_store.schedule;
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
