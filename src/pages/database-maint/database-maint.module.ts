import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { DatabaseMaintPage } from './database-maint';

@NgModule({
  declarations: [
    DatabaseMaintPage,
  ],
  imports: [
    IonicPageModule.forChild(DatabaseMaintPage),
  ],
})
export class DatabaseMaintPageModule {}
