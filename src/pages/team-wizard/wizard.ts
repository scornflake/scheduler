import {Slides} from "ionic-angular";
import {ViewChild} from "@angular/core";
import {action, observable} from "mobx-angular";

export class WizardPage {
    @ViewChild(Slides) slides: Slides;
    @observable saving: boolean = false;

    constructor() {

    }

    @action setIsSaving() {
        this.saving = true;
    }

    @action setIsNotSaving() {
        this.saving = false;
    }

    ionViewDidLoad() {
        this.slides.lockSwipes(true);
        this.slides.enableKeyboardControl(false);
    }

    nextSlide(slideNumber = null) {
        this.slides.lockSwipes(false);
        if (slideNumber != null) {
            this.slides.slideTo(slideNumber);
        } else {
            this.slides.slideNext(500, true);
        }
        this.slides.lockSwipes(true);
    }

    get nextIsVisible(): boolean {
        if (!this.slides) {
            return true;
        }
        if (!this.slides) {
            return true;
        }
        return !this.slides.isEnd();
    }

    get nextIsEnabled(): boolean {
        return true;
    }
}