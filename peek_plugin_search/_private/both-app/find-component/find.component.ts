import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {SearchResultObjectTuple, SearchService} from "@peek/peek_plugin_search";
import {SearchPropertyTuple, SearchObjectTypeTuple} from "@peek/peek_plugin_search/_private";

import {
    ComponentLifecycleEventEmitter,
    TupleActionPushService,
    TupleDataObserverService,
    TupleDataOfflineObserverService,
    TupleSelector
} from "@synerty/vortexjs";
import {Ng2BalloonMsgService} from "@synerty/ng2-balloon-msg";


@Component({
    selector: 'plugin-search-find',
    templateUrl: 'find.component.mweb.html',
    moduleId: module.id
})
export class FindComponent extends ComponentLifecycleEventEmitter {

    keywords: string = '';
    resultObjects: SearchResultObjectTuple[] = [];

    searchProperties: SearchPropertyTuple[] = [];

    searchObjectTypes: SearchObjectTypeTuple[] = [];

    constructor(private searchService: SearchService,
                private balloonMsg: Ng2BalloonMsgService,
                private tupleObserver: TupleDataOfflineObserverService) {
        super();

        let propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleObserver
            .subscribeToTupleSelector(propTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((v: SearchPropertyTuple[]) => {

                this.searchProperties = v
            });


        let objectTypeTs = new TupleSelector(SearchObjectTypeTuple.tupleName, {});
        this.tupleObserver
            .subscribeToTupleSelector(objectTypeTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((v: SearchObjectTypeTuple[]) => this.searchObjectTypes = v);

    }

    find() {
        this.searchService
            .getObjects(this.keywords)
            .then((results: SearchResultObjectTuple[]) => this.resultObjects = results)
            .catch((e: string) => this.balloonMsg.showError(`Find Failed:${e}`));
    }


}