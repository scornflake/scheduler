import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SheetSelectionPage } from './sheet-selection';

@NgModule({
  declarations: [
    SheetSelectionPage,
  ],
  imports: [
    IonicPageModule.forChild(SheetSelectionPage),
  ],
})
export class SheetSelectionPageModule {}
