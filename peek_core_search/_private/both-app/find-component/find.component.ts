import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {
    SearchObjectTypeTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_core_search";
import {SearchPropertyTuple, SearchTupleService} from "@peek/peek_core_search/_private";

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
    searchInProgress: boolean = false;

    searchProperties: SearchPropertyTuple[] = [];
    searchPropertyStrings: string[] = [];
    searchProperty: SearchPropertyTuple = new SearchPropertyTuple();
    searchPropertyNsPicking = false;

    searchObjectTypes: SearchObjectTypeTuple[] = [];
    searchObjectTypeStrings: string[] = [];
    searchObjectType: SearchObjectTypeTuple = new SearchObjectTypeTuple();
    searchObjectTypesNsPicking = false;

    constructor(private searchService: SearchService,
                private balloonMsg: Ng2BalloonMsgService,
                private tupleService: SearchTupleService) {
        super();
        this.searchProperty.title = "All";
        this.searchObjectType.title = "All";

        let propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(propTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((v: SearchPropertyTuple[]) => {
                // Create the empty item
                let all = new SearchPropertyTuple();
                all.title = "All";

                // Update the search objects
                this.searchProperties = [];
                this.searchProperties.add(v);
                this.searchProperties.splice(0, 0, all);

                // Set the string array and lookup by id
                this.searchPropertyStrings = [];

                for (let item of this.searchProperties) {
                    this.searchPropertyStrings.push(item.title);
                }
            });


        let objectTypeTs = new TupleSelector(SearchObjectTypeTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(objectTypeTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((v: SearchObjectTypeTuple[]) => {
                // Create the empty item
                let all = new SearchObjectTypeTuple();
                all.title = "All";

                // Update the search objects
                this.searchObjectTypes = [];
                this.searchObjectTypes.add(v);
                this.searchObjectTypes.splice(0, 0, all);

                // Set the string array, and object type lookup
                this.searchObjectTypeStrings = [];

                for (let item of this.searchObjectTypes) {
                    this.searchObjectTypeStrings.push(item.title);
                }
            });

    }

    nsSelectProperty(index: number): void {
        this.searchProperty = this.searchProperties[index];
    }

    nsEditPropertyFonticon(): string {
        return this.searchPropertyNsPicking ? 'fa-check' : 'fa-pencil';
    }

    nsSelectObjectType(index: number): void {
        this.searchObjectType = this.searchObjectTypes[index];
    }

    nsEditObjectTypeFonticon(): string {
        return this.searchPropertyNsPicking ? 'fa-check' : 'fa-pencil';
    }

    noResults(): boolean {
        return this.resultObjects.length == 0 && !this.searchInProgress;

    }

    find() {
        if (this.keywords == null || this.keywords.length == 0) {
            this.balloonMsg.showWarning("Please enter some search keywords");
            return;
        }

        this.searchInProgress = true;

        this.searchService
            .getObjects(this.searchProperty.name, this.searchObjectType.id, this.keywords)
            .then((results: SearchResultObjectTuple[]) => this.resultObjects = results)
            .catch((e: string) => this.balloonMsg.showError(`Find Failed:${e}`))
            .then(() => this.searchInProgress = false);
    }


}