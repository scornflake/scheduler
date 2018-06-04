import {ObjectValidation} from "../scheduling/shared";
import {ToastController} from "ionic-angular";
import {Injectable} from "@angular/core";

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

export {
    PageUtils
}