import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {RootStore} from "../../state/root";
import {CSVExporter} from "../../exporters/csv.exporter";
import {DataStoreProvider} from "../../providers/data-store/data-store";

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {

    constructor(public navCtrl: NavController,
                private store: RootStore,
                private provider: DataStoreProvider) {
    }

    clear_selection() {
        this.store.ui_store.selected_person = null;
    }

    export_as_csv() {
        let exporter = new CSVExporter(this.store.schedule);
        exporter.write_to_file("schedule.csv");
    }
}
