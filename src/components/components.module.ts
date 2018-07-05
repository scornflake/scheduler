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
import {OrganizationEditorComponent} from './organization-editor/organization-editor';
import {MobxAngularModule} from "mobx-angular";
import {IonSegmentHotfix} from "../common/directives";
import {ResponsiveModule} from "ng2-responsive";
import {CalendarComponent} from "./swbcalendar/swbcalendar";
import {Calendar} from "./ion-calendar/ion-calendar";
import {monthName} from "../common/pipes/month-name";
import { ShowPlanComponent } from './show-plan/show-plan';
import { WelcomeWizardComponent } from './welcome-wizard/welcome-wizard';

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
        OrganizationEditorComponent,
        IonSegmentHotfix,
        CalendarComponent,
        Calendar,
        monthName,
    ShowPlanComponent,
    WelcomeWizardComponent
    ],
    imports: [
        IonicModule,
        NgPipesModule,
        MobxAngularModule,
        ResponsiveModule,
    ],
    entryComponents: [
        CalendarComponent,
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
        OrganizationEditorComponent,
        Calendar,
        CalendarComponent,
        monthName,
    ShowPlanComponent,
    WelcomeWizardComponent
    ]
})
export class ComponentsModule {
}
