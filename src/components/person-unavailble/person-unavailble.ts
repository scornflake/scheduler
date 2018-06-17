import { Component } from '@angular/core';

/**
 * Generated class for the PersonUnavailbleComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'person-unavailble',
  templateUrl: 'person-unavailble.html'
})
export class PersonUnavailbleComponent {

  text: string;

  constructor() {
    console.log('Hello PersonUnavailbleComponent Component');
    this.text = 'Hello World';
  }

}
