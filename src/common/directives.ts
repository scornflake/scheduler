import {ChangeDetectorRef, ContentChildren, Directive, QueryList, Self} from '@angular/core';
import {Segment, SegmentButton} from 'ionic-angular';
import {Subscription} from 'rxjs';

// TODO: Hotfix for dynamic ion-segment-buttons issue (https://github.com/driftyco/ionic/issues/6923).
@Directive({
    selector: 'ion-segment'
})
export class IonSegmentHotfix {
    private subscriptions: Subscription;

    @ContentChildren(SegmentButton)
    buttons: QueryList<SegmentButton>;

    constructor(@Self() private segment: Segment, private cf : ChangeDetectorRef) {
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

    private onChildrenChanged() {
        setTimeout(() => {
            this.segment.ngAfterContentInit();
            this.segment._inputUpdated();

            /*
            This is required because of a bug with ion-select when inside something with modified ChangeDetection
            https://forum.ionicframework.com/t/ion-segment-issues/97241/5
             */
            this.cf.detectChanges();
        });
    }
}