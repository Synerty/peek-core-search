import { filter, first, map, takeUntil } from "rxjs/operators";
import { Injectable } from "@angular/core";
import {
    NgLifeCycleEvents,
    TupleSelector,
    VortexStatusService,
} from "@synerty/vortexjs";
import { PrivateSearchIndexLoaderService } from "./_private/search-index-loader";
import { PrivateSearchObjectLoaderService } from "./_private/search-object-loader";
import { SearchResultObjectTuple } from "./SearchResultObjectTuple";
import { SearchObjectTypeTuple } from "./SearchObjectTypeTuple";
import { SearchPropertyTuple, SearchTupleService } from "./_private";
import { KeywordAutoCompleteTupleAction } from "./_private/tuples/KeywordAutoCompleteTupleAction";
import { DeviceOfflineCacheService } from "@peek/peek_core_device";
import { FastKeywordController } from "./_private/fast-keyword-controller";
import { Observable, zip } from "rxjs";

export interface SearchPropT {
    title: string;
    value: string;
    order: number;

    // Should this property be shown as the name in the search result
    showInHeader: boolean;

    // Should this property be shown on the search result at all.
    showOnResult: boolean;
}

// ----------------------------------------------------------------------------
/** LocationIndex Cache
 *
 * This class has the following responsibilities:
 *
 * 1) Maintain a local storage of the index
 *
 * 2) Return DispKey locations based on the index.
 *
 */
@Injectable()
export class SearchService extends NgLifeCycleEvents {
    // From python string.punctuation

    // Passed to each of the results
    private propertiesByName: { [key: string]: SearchPropertyTuple } = {};

    // Passed to each of the results
    private objectTypesById: { [key: number]: SearchObjectTypeTuple } = {};

    private fastIndexController: FastKeywordController;

    constructor(
        private vortexStatusService: VortexStatusService,
        private tupleService: SearchTupleService,
        private searchIndexLoader: PrivateSearchIndexLoaderService,
        private searchObjectLoader: PrivateSearchObjectLoaderService,
        private deviceCacheControllerService: DeviceOfflineCacheService
    ) {
        super();
        this.fastIndexController = new FastKeywordController(
            searchIndexLoader,
            searchObjectLoader,
            tupleService,
            this
        );
        this._loadPropsAndObjs();
    }

    get canSearchOffline$(): Observable<boolean> {
        return zip(
            this.searchIndexLoader.isReadyObservable(),
            this.searchObjectLoader.isReadyObservable()
        )
            .pipe(
                filter(
                    () =>
                        this.searchObjectLoader.offlineEnabled &&
                        this.searchIndexLoader.offlineEnabled
                )
            )
            .pipe(map((values) => true));
    }

    haveEnoughSearchKeywords(keywordsString: string): boolean {
        return this.fastIndexController.haveEnoughSearchKeywords(
            keywordsString
        );
    }

    /** Get Locations
     *
     * Get the objects with matching keywords from the index..
     *
     */
    async getObjects(
        propertyName: string | null,
        objectTypeId: number | null,
        keywordsString: string
    ): Promise<SearchResultObjectTuple[]> {
        if (!this.haveEnoughSearchKeywords(keywordsString)) {
            console.log(
                `Skipping search for '${keywordsString}'` +
                    ` as it's too short after excluding keywords`
            );
            return [];
        }

        // If we're online
        if (this.vortexStatusService.snapshot.isOnline) {
            return this.getObjectsOnline(
                propertyName,
                objectTypeId,
                keywordsString
            );
        }

        const offlineEnabled =
            this.searchIndexLoader.offlineEnabled &&
            this.searchObjectLoader.offlineEnabled;

        // If there is no offline support
        if (!offlineEnabled) {
            throw new Error(
                "Peek is offline and the offline cache has not finished loading"
            );
        }

        return this.getObjectsOffline(
            propertyName,
            objectTypeId,
            keywordsString
        );
    }

    private async getObjectsOnline(
        propertyName: string | null,
        objectTypeId: number | null,
        keywordsString: string
    ): Promise<SearchResultObjectTuple[]> {
        const autoCompleteAction = new KeywordAutoCompleteTupleAction();
        autoCompleteAction.searchString = keywordsString;
        autoCompleteAction.propertyName = propertyName;
        autoCompleteAction.objectTypeId = objectTypeId;

        const results: any = await this.tupleService.action //
            .pushAction(autoCompleteAction);
        return this._loadObjectTypes(results);
    }

    private async getObjectsOffline(
        propertyName: string | null,
        objectTypeId: number | null,
        keywordsString: string
    ): Promise<SearchResultObjectTuple[]> {
        const results: any = await this.fastIndexController //
            .getObjects(propertyName, objectTypeId, keywordsString);
        return this._loadObjectTypes(results);
    }

    /** Get Nice Ordered Properties
     *
     * @param {SearchResultObjectTuple} obj
     * @returns {SearchPropT[]}
     */
    getNiceOrderedProperties(obj: SearchResultObjectTuple): SearchPropT[] {
        let props: SearchPropT[] = [];

        for (let name of Object.keys(obj.properties)) {
            let prop =
                this.propertiesByName[name.toLowerCase()] ||
                new SearchPropertyTuple();
            props.push({
                title: prop.title,
                order: prop.order,
                value: obj.properties[name],
                showInHeader: prop.showInHeader,
                showOnResult: prop.showOnResult,
            });
        }
        props.sort((a, b) => a.order - b.order);

        return props;
    }

    private _loadPropsAndObjs(): void {
        let propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(propTs)
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((tuples: SearchPropertyTuple[]) => {
                this.propertiesByName = {};

                for (let item of tuples) {
                    this.propertiesByName[item.name] = item;
                }
            });

        let objectTypeTs = new TupleSelector(
            SearchObjectTypeTuple.tupleName,
            {}
        );
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(objectTypeTs)
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((tuples: SearchObjectTypeTuple[]) => {
                this.objectTypesById = {};

                for (let item of tuples) {
                    this.objectTypesById[item.id] = item;
                }
            });
    }

    /** Load Object Types
     *
     * Relinks the object types for search results.
     *
     * @param {SearchResultObjectTuple} searchObjects
     * @returns {SearchResultObjectTuple[]}
     */
    private _loadObjectTypes(
        searchObjects: SearchResultObjectTuple[]
    ): SearchResultObjectTuple[] {
        for (let searchObject of searchObjects) {
            searchObject.objectType =
                this.objectTypesById[searchObject.objectType.id];
        }
        return searchObjects;
    }
}
