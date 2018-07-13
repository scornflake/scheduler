import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TryToScheduleWithOtherPage } from './try-to-schedule-with-other';

@NgModule({
  declarations: [
    TryToScheduleWithOtherPage,
  ],
  imports: [
    IonicPageModule.forChild(TryToScheduleWithOtherPage),
  ],
})
export class TryToScheduleWithOtherPageModule {}
