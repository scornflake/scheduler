import {ObjectValidation} from "../scheduling/shared";
import {ToastController} from "ionic-angular";
import {Injectable} from "@angular/core";
import deepEqual from "deep-equal";


@Injectable()
class PageUtils {
    constructor(private toastController: ToastController) {

    }

    public show_validation_error(validation: ObjectValidation, stay_open: boolean = false) {
        let options = {
            message: validation.errors.join(", "),
            cssClass: 'validation',
            showCloseButton: stay_open
        };
        if (!stay_open) {
            options['delay'] = 3000;
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