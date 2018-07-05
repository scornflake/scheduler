import {Component, EventEmitter, Output} from '@angular/core';
import {RootStore} from "../../store/root";

@Component({
    selector: 'show-plan',
    templateUrl: 'show-plan.html'
})
export class ShowPlanComponent {
    @Output() editPlanClicked = new EventEmitter();

    constructor(public store: RootStore) {
    }

}
