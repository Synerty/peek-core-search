import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {SearchResultObjectTuple, SearchService} from "@peek/peek_plugin_search";

import {
    ComponentLifecycleEventEmitter,
    TupleActionPushService,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";


@Component({
    selector: 'plugin-search-find',
    templateUrl: 'find.component.mweb.html',
    moduleId: module.id
})
export class FindComponent extends ComponentLifecycleEventEmitter {

    keywords: string = '';
    resultObjects: SearchResultObjectTuple = [];

    constructor(private searchService: SearchService) {
        super();


    }

    find() {
    }


}