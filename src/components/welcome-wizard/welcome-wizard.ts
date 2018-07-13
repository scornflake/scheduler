import {Component, EventEmitter, Output} from '@angular/core';
import {RootStore} from "../../store/root";

@Component({
    selector: 'welcome-wizard',
    templateUrl: 'welcome-wizard.html'
})
export class WelcomeWizardComponent {
    @Output() createTeamClicked = new EventEmitter();
    @Output() createPlanClicked = new EventEmitter();

    constructor(public store: RootStore) {
    }
}
