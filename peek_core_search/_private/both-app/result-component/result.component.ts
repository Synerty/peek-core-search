import {Component, Input, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {searchBaseUrl, SearchPropertyTuple} from "@peek/peek_core_search/_private";

import {
    ComponentLifecycleEventEmitter,
    TupleActionPushService,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";

import {
    SearchObjectTypeTuple,
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_core_search";

interface PropT {
    title: string;
    value: string;
    order: number;
}

@Component({
    selector: 'plugin-search-result',
    templateUrl: 'result.component.mweb.html',
    moduleId: module.id
})
export class ResultComponent extends ComponentLifecycleEventEmitter implements OnInit {

    @Input("resultObject")
    resultObject: SearchResultObjectTuple = new SearchResultObjectTuple();

    properties: PropT[] = [];

    constructor(private router: Router,
                private searchService: SearchService) {
        super();

    }

    ngOnInit() {
        this.properties = this.searchService.getNiceOrderedProperties(this.resultObject);
    }


    navTo(objectRoute: SearchResultObjectRouteTuple): void {
        objectRoute.navTo(this.router);

    }


}