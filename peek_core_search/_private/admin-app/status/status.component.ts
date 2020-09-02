import {Component} from "@angular/core";
import {
    ComponentLifecycleEventEmitter,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";
import {AdminStatusTuple, searchFilt} from "@peek/peek_core_search/_private";
import { BalloonMsgService } from "@synerty/peek-plugin-base-js"


@Component({
    selector: 'pl-search-status',
    templateUrl: './status.component.html'
})
export class StatusComponent extends ComponentLifecycleEventEmitter {

    item: AdminStatusTuple = new AdminStatusTuple();

    constructor(private balloonMsg: BalloonMsgService,
                private tupleObserver: TupleDataObserverService) {
        super();

        let ts = new TupleSelector(AdminStatusTuple.tupleName, {});
        this.tupleObserver.subscribeToTupleSelector(ts)
            .takeUntil(this.onDestroyEvent)
            .subscribe((tuples: AdminStatusTuple[]) => {
                this.item = tuples[0];
            });

    }


}
