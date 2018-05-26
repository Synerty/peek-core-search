import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {PropertyTuple, searchBaseUrl} from "@peek/peek_plugin_search/_private";

import {
    ComponentLifecycleEventEmitter,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";

import {TupleActionPushService} from "@synerty/vortexjs";

import {
    AddIntValueActionTuple,
    StringCapToggleActionTuple
} from "@peek/peek_plugin_search/_private";


@Component({
    selector: 'plugin-search-property',
    templateUrl: 'result-open.component.mweb.html',
    moduleId: module.id
})
export class ResultOpenComponent extends ComponentLifecycleEventEmitter {

    propertys: Array<PropertyTuple> = [];

    constructor(private actionService: TupleActionPushService,
                private tupleDataObserver: TupleDataObserverService,
                private router: Router) {
        super();

        // Create the TupleSelector to tell the observable what data we want
        let selector = {};
        // Add any filters of the data here
        // selector["lookupName"] = "brownCowList";
        let tupleSelector = new TupleSelector(PropertyTuple.tupleName, selector);

        // Setup a subscription for the data
        let sup = tupleDataObserver.subscribeToTupleSelector(tupleSelector)
            .subscribe((tuples: PropertyTuple[]) => {
                // We've got new data, assign it to our class variable
                this.propertys = tuples;
            });

        // unsubscribe when this component is destroyed
        // This is a feature of ComponentLifecycleEventEmitter
        this.onDestroyEvent.subscribe(() => sup.unsubscribe());

    }

    toggleUpperCicked(item) {
        let action = new StringCapToggleActionTuple();
        action.propertyId = item.id;
        this.actionService.pushAction(action)
            .then(() => {
                alert('success');

            })
            .catch((err) => {
                alert(err);
            });
    }


    incrementCicked(item) {
        let action = new AddIntValueActionTuple();
        action.propertyId = item.id;
        action.offset = 1;
        this.actionService.pushAction(action)
            .then(() => {
                alert('success');

            })
            .catch((err) => {
                alert(err);
            });
    }


    decrementCicked(item) {
        let action = new AddIntValueActionTuple();
        action.propertyId = item.id;
        action.offset = -1;
        this.actionService.pushAction(action)
            .then(() => {
                alert('success');

            })
            .catch((err) => {
                alert(err);
            });
    }

    mainClicked() {
        this.router.navigate([searchBaseUrl]);
    }

}