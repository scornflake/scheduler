import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TabSelectionPage } from './tab-selection';

@NgModule({
  declarations: [
    TabSelectionPage,
  ],
  imports: [
    IonicPageModule.forChild(TabSelectionPage),
  ],
})
export class TabSelectionPageModule {}
