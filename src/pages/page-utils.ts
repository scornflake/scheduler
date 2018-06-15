import {ObjectValidation} from "../scheduling/shared";
import {ToastController} from "ionic-angular";
import {Injectable} from "@angular/core";
import deepEqual from "deep-equal";
import {ToastOptions} from "ionic-angular/components/toast/toast-options";


@Injectable()
class PageUtils {
    constructor(private toastController: ToastController) {
    }

    public show_validation_error(validation: ObjectValidation, stay_open: boolean = false) {
        this.show_alert(validation.errors.join(", "), {cssClass: 'validation'}, stay_open);
    }

    public show_error(message: string) {
        this.show_alert(message, {cssClass: 'validation'}, false);
    }

    show_message(message: string) {
        this.show_alert(message, {cssClass: 'success'}, false);
    }

    private show_alert(message, more_options: ToastOptions, stay_open: boolean = false) {
        let options = {
            message: message,
            showCloseButton: stay_open
        };
        if (more_options) {
            Object.assign(options, more_options);
        }
        if (!stay_open) {
            options['duration'] = 3000;
        }
        let t = this.toastController.create(options);
        t.present();
    }

}

@Injectable()
class ObjectUtils {
    static deep_equal(old_data, new_data): boolean {
        return deepEqual(old_data, new_data);
    }
}

export {
    PageUtils,
    ObjectUtils
}