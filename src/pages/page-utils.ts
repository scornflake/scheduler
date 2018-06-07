import {ObjectValidation} from "../scheduling/shared";
import {ToastController} from "ionic-angular";
import {Injectable} from "@angular/core";
import deepEqual from "deep-equal";


@Injectable()
class PageUtils {
    constructor(private toastController: ToastController) {

    }

    public show_validation_error(validation: ObjectValidation) {
        let t = this.toastController.create({
            message: validation.errors.join(", "),
            duration: 3000,
            cssClass: 'validation'
        });
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