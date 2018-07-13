import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { GenericListOfThingsPage } from './generic-list-of-things';

@NgModule({
  declarations: [
    GenericListOfThingsPage,
  ],
  imports: [
    IonicPageModule.forChild(GenericListOfThingsPage),
  ],
})
export class GenericListOfThingsPageModule {}
