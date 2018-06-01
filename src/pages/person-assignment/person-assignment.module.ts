import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PersonAssignmentPage } from './person-assignment';

@NgModule({
  declarations: [
    PersonAssignmentPage,
  ],
  imports: [
    IonicPageModule.forChild(PersonAssignmentPage),
  ],
})
export class PersonAssignmentPageModule {}
