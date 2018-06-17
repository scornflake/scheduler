import {Component} from '@angular/core';
import includes from 'lodash/includes';
import {RootStore} from "../../store/root";
import {Observable} from "rxjs/Observable";

@Component({
    selector: 'person-editor',
    templateUrl: 'person-editor.html'
})
export class PersonEditorComponent {
    constructor(private store: RootStore) {
    }


    scheduled_dates$(): Observable<Array<any>> {
        return this.store.schedule$.map(schedule => {
            return Array.from(schedule.dates.values()).filter(v => {
                return includes(v.people, this.store.ui_store.selected_person);
            })
        });
    }
}
