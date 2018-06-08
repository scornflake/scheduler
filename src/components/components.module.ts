import {NgModule} from '@angular/core';
import {ScheduleViewerComponent} from './schedule-viewer/schedule-viewer';
import {IonicModule} from "ionic-angular";
import {NgPipesModule} from "angular-pipes";
import {PersonEditorComponent} from './person-editor/person-editor';
import {ReasonsComponent} from './reasons/reasons';
import {ShowFormErrorsComponent} from "./show-form-errors/show-form-errors";
import {PersonDetailsComponent} from './person-details/person-details';
import {AvailabilityOptionsComponent} from './availability-options/availability-options';
import {RoleSummaryComponent} from './role-summary/role-summary';
import {RoleDetailComponent} from './role-detail/role-detail';
import {RuleDetailsComponent} from './rule-details/rule-details';
import {PeopleComponent} from './people/people';
import { SavingStateComponent } from './saving-state/saving-state';

@NgModule({
    declarations: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ShowFormErrorsComponent,
        ReasonsComponent,
        PersonDetailsComponent,
        AvailabilityOptionsComponent,
        RoleSummaryComponent,
        RoleDetailComponent,
        RuleDetailsComponent,
        PeopleComponent,
    SavingStateComponent,
    ],
    imports: [
        IonicModule,
        NgPipesModule,
    ],
    exports: [
        ScheduleViewerComponent,
        PersonEditorComponent,
        ReasonsComponent,
        ShowFormErrorsComponent,
        PersonDetailsComponent,
        AvailabilityOptionsComponent,
        RoleSummaryComponent,
        RoleDetailComponent,
        RuleDetailsComponent,
        PeopleComponent,
    SavingStateComponent,
    ]
})
export class ComponentsModule {
}
