import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";
import {ReasonsComponent} from './reasons/reasons';
import {ShowFormErrorsComponent} from "./show-form-errors/show-form-errors";
import {PersonDetailsComponent} from './person-details/person-details';
import {AvailabilityOptionsComponent} from './availability-options/availability-options';
import {RoleSummaryComponent} from './role-summary/role-summary';
import {RoleDetailComponent} from './role-detail/role-detail';
import {RuleDetailsComponent} from './rule-details/rule-details';
import {PeopleComponent} from './people/people';
import {SavingStateComponent} from './saving-state/saving-state';
import {PersonScheduleComponent} from './person-schedule/person-schedule';
import {PersonUnavailableComponent} from './person-unavailable/person-unavailable';
import {PlanDateRangeComponent} from './plan-date-range/plan-date-range';
import {OrganizationEditorComponent} from './organization-editor/organization-editor';
import {MobxAngularModule} from "mobx-angular";
import {IonSegmentHotfix} from "../common/directives";
import {ResponsiveModule} from "ng2-responsive";

@NgModule({
    declarations: [
        ScheduleViewerComponent,
        ShowFormErrorsComponent,
        ReasonsComponent,
        PersonDetailsComponent,
        AvailabilityOptionsComponent,
        RoleSummaryComponent,
        RoleDetailComponent,
        RuleDetailsComponent,
        PeopleComponent,
        SavingStateComponent,
        PersonScheduleComponent,
        PersonUnavailableComponent,
        PlanDateRangeComponent,
        OrganizationEditorComponent,
        IonSegmentHotfix,
    ],
    imports: [
        IonicModule,
        NgPipesModule,
        MobxAngularModule,
        ResponsiveModule
    ],
    exports: [
        ScheduleViewerComponent,
        ReasonsComponent,
        ShowFormErrorsComponent,
        PersonDetailsComponent,
        AvailabilityOptionsComponent,
        RoleSummaryComponent,
        RoleDetailComponent,
        RuleDetailsComponent,
        PeopleComponent,
        SavingStateComponent,
        PersonScheduleComponent,
        PersonUnavailableComponent,
        PlanDateRangeComponent,
        OrganizationEditorComponent,
    ]
})
export class ComponentsModule {
}
