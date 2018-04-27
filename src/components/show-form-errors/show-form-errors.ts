import {Component, Input} from '@angular/core';
import {FormGroup} from "@angular/forms";
import * as to from "to-case";

@Component({
    selector: 'show-form-errors',
    templateUrl: 'show-form-errors.html'
})
export class ShowFormErrorsComponent {
    @Input() control: FormGroup;

    private errorMessages = {
        'required': (name) => `${name} is required`,
        'email': (name) => `${name} should be a valid email address`,
        'minlength': (name, params) => `${name} should be at least ${params.requiredLength} characters`,
        'maxlength': (name, params) => `${name} should be at most ${params.requiredLength} characters`,
        'pattern': (name, params) => `The required pattern is: ${params.requiredPattern}`,
    };

    constructor() {
    }

    public addMessage(type: string, callback: object) {
        this.errorMessages[type] = callback;
    }

    get showErrors(): boolean | null {
        // console.log(`Invalid: ${this.control.invalid}, Dirty: ${this.control.dirty}, Touched: ${this.control.touched}`);
        return this.errors.length > 0 && (this.control.dirty || this.control.touched);
    }

    get errors(): string[] {
        let errors: Array<string> = [];
        for (let fieldName of Object.keys(this.control.controls)) {
            let ctrl = this.control.get(fieldName);
            if (ctrl && ctrl.invalid) {
                if (ctrl.errors) {
                    // console.log(fieldName + " has errors: " + SafeJSON.Stringify(ctrl.errors));
                    for (let errorType of Object.keys(ctrl.errors)) {
                        let theError = ctrl.errors[errorType];
                        let message = this.getMessage(fieldName, errorType, theError);
                        // console.log("Add " + message + " for " + fieldName + "/" + errorType);
                        errors.push(message)
                    }
                }
            }
        }
        // console.log(`Errors: ${errors}`);
        return errors;
    }

    private getMessage(fieldName: string, type: string, params: any): string {
        fieldName = to.capital(fieldName);
        if (this.errorMessages[type]) {
            // console.log(`Calling func for ${type}`);
            return this.errorMessages[type](fieldName, params);
        }
        return params.message;
    }
}
