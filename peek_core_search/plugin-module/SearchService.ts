import {Injectable} from "@angular/core";


import {
    ComponentLifecycleEventEmitter,
    TupleSelector,
    VortexStatusService
} from "@synerty/vortexjs";
import {PrivateSearchIndexLoaderService} from "./_private/search-index-loader";
import {PrivateSearchObjectLoaderService} from "./_private/search-object-loader";

import {SearchResultObjectTuple} from "./SearchResultObjectTuple";
import {SearchObjectTypeTuple} from "./SearchObjectTypeTuple";
import {OfflineConfigTuple, SearchPropertyTuple, SearchTupleService} from "./_private";
import {KeywordAutoCompleteTupleAction} from "./_private/tuples/KeywordAutoCompleteTupleAction";


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
export class SearchService extends ComponentLifecycleEventEmitter {
    // From python string.punctuation

    private offlineConfig: OfflineConfigTuple = new OfflineConfigTuple();

    // Passed to each of the results
    private propertiesByName: { [key: string]: SearchPropertyTuple; } = {};

    // Passed to each of the results
    private objectTypesById: { [key: number]: SearchObjectTypeTuple; } = {};

    constructor(private vortexStatusService: VortexStatusService,
                private tupleService: SearchTupleService,
                private searchIndexLoader: PrivateSearchIndexLoaderService,
                private searchObjectLoader: PrivateSearchObjectLoaderService) {
        super();


        this.tupleService.offlineObserver
            .subscribeToTupleSelector(new TupleSelector(OfflineConfigTuple.tupleName, {}))
            .takeUntil(this.onDestroyEvent)
            .filter(v => v.length != 0)
            .subscribe((tuples: OfflineConfigTuple[]) => {
                this.offlineConfig = tuples[0];
            });

        this._loadPropsAndObjs();

    }

    private _loadPropsAndObjs(): void {

        let propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(propTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((tuples: SearchPropertyTuple[]) => {
                this.propertiesByName = {};

                for (let item of tuples) {
                    this.propertiesByName[item.name] = item;
                }
            });

        let objectTypeTs = new TupleSelector(SearchObjectTypeTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(objectTypeTs)
            .takeUntil(this.onDestroyEvent)
            .subscribe((tuples: SearchObjectTypeTuple[]) => {
                this.objectTypesById = {};

                for (let item of tuples) {
                    this.objectTypesById[item.id] = item;
                }
            });
    }


    /** Get Locations
     *
     * Get the objects with matching keywords from the index..
     *
     */
    getObjects(propertyName: string | null,
               objectTypeId: number | null,
               keywordsString: string): Promise<SearchResultObjectTuple[]> {

        // If there is no offline support, or we're online
        if (!this.offlineConfig.cacheChunksForOffline
            || this.vortexStatusService.snapshot.isOnline) {
            let ts = new TupleSelector(SearchResultObjectTuple.tupleName, {
                "propertyName": propertyName,
                "objectTypeId": objectTypeId,
                "keywordsString": keywordsString
            });

            let isOnlinePromise: any = this.vortexStatusService.snapshot.isOnline ?
                Promise.resolve() :
                this.vortexStatusService.isOnline
                    .filter(online => online)
                    .first()
                    .toPromise();

            return isOnlinePromise
                .then(() => this.tupleService.offlineObserver.pollForTuples(ts, false))
                .then(v => this._loadObjectTypes(v));
        }

        // If we do have offline support
        return this.searchIndexLoader.getObjectIds(propertyName, keywordsString)
            .then((objectIds: number[]) => {
                if (objectIds.length == 0) {
                    console.log("There were no keyword search results for : " + keywordsString);
                    return [];
                }

                return this.searchObjectLoader.getObjects(objectTypeId, objectIds)
                    .then(v => this._loadObjectTypes(v));
            })

    }

    async getObjectsOnlinePartial(propertyName: string | null,
                                  objectTypeId: number | null,
                                  keywordsString: string): Promise<SearchResultObjectTuple[]> {

        const autoCompleteAction = new KeywordAutoCompleteTupleAction();
        autoCompleteAction.searchString = keywordsString;
        autoCompleteAction.propertyName = propertyName;
        autoCompleteAction.objectTypeId = objectTypeId;

        let results = await <any>this.tupleService.action.pushAction(autoCompleteAction);
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
            let prop = this.propertiesByName[name.toLowerCase()] || new SearchPropertyTuple();
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

    /** Load Object Types
     *
     * Relinks the object types for search results.
     *
     * @param {SearchResultObjectTuple} searchObjects
     * @returns {SearchResultObjectTuple[]}
     */
    private _loadObjectTypes(searchObjects: SearchResultObjectTuple []): SearchResultObjectTuple[] {
        for (let searchObject of searchObjects) {
            searchObject.objectType = this.objectTypesById[searchObject.objectType.id];
        }
        return searchObjects;
    }

}

