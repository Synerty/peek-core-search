import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {SearchResultObjectTuple, SearchService} from "@peek/peek_plugin_search";
import {
    SearchObjectTypeTuple,
    SearchPropertyTuple
} from "@peek/peek_plugin_search/_private";

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
    templateUrl: 'find.component.web.html',
    moduleId: module.id
})
export class FindComponent extends ComponentLifecycleEventEmitter {

    keywords: string = '';

    resultObjects: SearchResultObjectTuple[] = [];

    searchProperties: SearchPropertyTuple[] = [];
    searchPropertyStrings: string[] = [];
    searchProperty: SearchPropertyTuple = new SearchPropertyTuple();
    searchPropertyNsPicking = false;

    // Passed to each of the results
    propertiesByName: { [key: string]: SearchPropertyTuple; } = {};


    searchObjectTypes: SearchObjectTypeTuple[] = [];
    searchObjectTypeStrings: string[] = [];
    searchObjectType: SearchObjectTypeTuple = new SearchObjectTypeTuple();
    searchObjectTypesNsPicking = false;

    // Passed to each of the results
    objectTypesById: { [key: number]: SearchObjectTypeTuple; } = {};

    constructor(private searchService: SearchService,
                private balloonMsg: Ng2BalloonMsgService,
                private tupleObserver: TupleDataOfflineObserverService) {
        super();
        this.searchProperty.title = "All";
        this.searchObjectType.title = "All";

        let propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleObserver
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
                this.propertiesByName = {};

                for (let item of this.searchProperties) {
                    this.searchPropertyStrings.push(item.title);
                    this.propertiesByName[item.name] = item;
                }
            });


        let objectTypeTs = new TupleSelector(SearchObjectTypeTuple.tupleName, {});
        this.tupleObserver
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
                this.objectTypesById = {};

                for (let item of this.searchObjectTypes) {
                    this.searchObjectTypeStrings.push(item.title);
                    this.objectTypesById[item.id] = item;
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

    objectTypeNameForResult(item: SearchResultObjectTuple) {
        let objType = this.objectTypesById[item.objectTypeId];
        return objType == null ? '' : objType.title;
    }

    find() {
        if (this.keywords == null || this.keywords.length == 0) {
            this.balloonMsg.showWarning("Please enter some search keywords");
            return;
        }

        this.searchService
            .getObjects(this.searchProperty.name, this.searchObjectType.id, this.keywords)
            .then((results: SearchResultObjectTuple[]) => this.resultObjects = results)
            .catch((e: string) => this.balloonMsg.showError(`Find Failed:${e}`));
    }


}