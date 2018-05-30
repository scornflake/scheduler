import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RoleDetailPage } from './role-detail';

@NgModule({
  declarations: [
    RoleDetailPage,
  ],
  imports: [
    IonicPageModule.forChild(RoleDetailPage),
  ],
})
export class RoleDetailPageModule {}
