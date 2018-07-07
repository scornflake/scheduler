import {
    ChangeDetectorRef,
    ContentChildren,
    Directive, Input,
    NgModule, NgZone,
    QueryList,
    Renderer,
    Self,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import {DateTime, Segment, SegmentButton} from 'ionic-angular';
import {Subscription} from 'rxjs';
import {MobxAutorunDirective} from "mobx-angular";
import {autorun, trace} from "mobx";

// TODO: Hotfix for dynamic ion-segment-buttons issue (https://github.com/driftyco/ionic/issues/6923).
@Directive({
    selector: 'ion-segment'
})
export class IonSegmentHotfix {
    private subscriptions: Subscription;

    @ContentChildren(SegmentButton)
    buttons: QueryList<SegmentButton>;

    constructor(@Self() private segment: Segment, private cf: ChangeDetectorRef) {
    }

    ngAfterViewInit() {
    }

    ngAfterContentInit() {
        this.subscriptions = this.buttons.changes.subscribe(() => this.onChildrenChanged());
        this.onChildrenChanged();
    }

    ngOnDestroy() {
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
            this.subscriptions = null;
        }
    }

    onChildrenChanged() {
        setTimeout(() => {
            this.segment.ngAfterContentInit();
            this.segment._inputUpdated();

            /*
            This is required because of a bug with ion-select when inside something with modified ChangeDetection
            https://forum.ionicframework.com/t/ion-segment-issues/97241/5
             */
            this.doDetectChanges();
        });
    }

    doDetectChanges() {
        this.cf.detectChanges();
    }
}

@Directive({
    selector: '[mobxTraceAutorun]'
})
export class MobxTraceAutorun extends MobxAutorunDirective {
    @Input('mobxTraceAutorun') options: string;

    private disabled: boolean = false;
    private trace: boolean = false;

    constructor(templateRef: TemplateRef<any>, viewContainer: ViewContainerRef, renderer: Renderer) {
        super(templateRef, viewContainer, renderer);
    }

    ngOnInit(): void {
        if (this.options) {
            if (this.options.includes('trace')) {
                this.trace = true;
            }
            console.warn(`MobxTraceAutorun: options: ${this.options}, trace: ${this.trace}`);
        }
        super.ngOnInit();
    }

    autoDetect(view: any): void {
        if (this.disabled) {
            return;
        }
        let enableTracing = this.trace;
        let autorunName = view._view.component
            ? view._view.component.constructor.name + ".detectChanges()" // angular 4+
            : view._view.parentView.context.constructor.name + ".detectChanges()"; // angular 2
        this.dispose = autorun(function () {
            if (enableTracing) {
                trace();
            }
            /*
            It appears executing this immediately can interfere with animations / UI.
            However; if you do it delayed, you can end up with exceptions due to the view already being destroyed.
             */
            view['detectChanges']();
        }, {name: autorunName});
    }
}


/*
I had problems with ion-datetime.
If bound to a stream$|async, it would display the value on page load OK. But if it was bound to some normal object, no... it wouldn't.
It *would* show the value as soon as I clicked on some other control in the view tho.
 */
@Directive({
    selector: 'ion-datetime'
})
export class IonDateTimeHotfix {
    constructor(@Self() private dateTime: DateTime, private cf: ChangeDetectorRef) {
    }

    ngAfterContentInit() {
        this.onChildrenChanged();
    }

    onChildrenChanged() {
        setTimeout(() => {
            this.cf.markForCheck();
        });
    }
}

@NgModule({
    declarations: [
        IonDateTimeHotfix,
        IonSegmentHotfix,
        MobxTraceAutorun,
    ],
    exports: [
        IonDateTimeHotfix,
        IonSegmentHotfix,
        MobxTraceAutorun,
    ]
})
export class SchedulerDirectivesModule {
}
