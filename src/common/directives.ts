import {
    ChangeDetectorRef,
    ContentChildren,
    Directive,
    Input,
    NgModule, NgZone,
    QueryList,
    Renderer,
    Self,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import {Segment, SegmentButton} from 'ionic-angular';
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

    constructor(templateRef: TemplateRef<any>, viewContainer: ViewContainerRef, renderer: Renderer, private zone: NgZone) {
        super(templateRef, viewContainer, renderer);
    }

    ngOnInit(): void {
        if (this.options) {
            if (this.options.includes('trace')) {
                this.trace = true;
            }
            console.warn(`MobxTraceAutorun: options: ${this.options}, trace: ${this.trace}`);
        } else {
            // console.warn(`MobxTraceAutorun NONE: options=  ${this.options}`);
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
        this.dispose = autorun(() => {
            if (enableTracing == true) {
                trace();
            }
            this.zone.run(() => {
                view['detectChanges']();
            });
        }, {name: autorunName});
    }
}


@NgModule({
    declarations: [
        IonSegmentHotfix,
        MobxTraceAutorun,
    ],
    exports: [
        IonSegmentHotfix,
        MobxTraceAutorun,
    ]
})
export class SchedulerDirectivesModule {
}
