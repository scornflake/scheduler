import {Component, Input} from '@angular/core';
import {Plan} from "../../scheduling/plan";
import {PageUtils} from "../../pages/page-utils";

@Component({
    selector: 'plan-date-range',
    templateUrl: 'plan-date-range.html'
})
export class PlanDateRangeComponent {
    @Input() plan: Plan;

    constructor(private pageUtils: PageUtils) {
    }

}
