import {Component, Input} from "@angular/core";
import {Router} from "@angular/router";
import {PropertyTuple, searchBaseUrl} from "@peek/peek_plugin_search/_private";

import {
    ComponentLifecycleEventEmitter,
    TupleActionPushService,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";

import {
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_plugin_search";


@Component({
    selector: 'plugin-search-result',
    templateUrl: 'result.component.mweb.html',
    moduleId: module.id
})
export class ResultComponent extends ComponentLifecycleEventEmitter {

    @Input("resultObjects")
    resultObjects: SearchResultObjectTuple = new SearchResultObjectTuple();

    constructor(private router: Router) {
        super();

    }


}