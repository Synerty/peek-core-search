import { filter, first, takeUntil } from "rxjs/operators";
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
import { DeviceOfflineCacheControllerService } from "@peek/peek_core_device";

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

    constructor(
        private vortexStatusService: VortexStatusService,
        private tupleService: SearchTupleService,
        private searchIndexLoader: PrivateSearchIndexLoaderService,
        private searchObjectLoader: PrivateSearchObjectLoaderService,
        private deviceCacheControllerService: DeviceOfflineCacheControllerService
    ) {
        super();

        this.deviceCacheControllerService.triggerCachingObservable
            .pipe(takeUntil(this.onDestroyEvent))
            .pipe(filter((v) => v))
            .subscribe(() => {
                // ???
            });

        this._loadPropsAndObjs();
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
        // If we're online
        if (this.vortexStatusService.snapshot.isOnline) {
            return this.getObjectsOnline(
                propertyName,
                objectTypeId,
                keywordsString
            );
        }

        // If there is no offline support
        if (!this.deviceCacheControllerService.cachingEnabled) {
            throw new Error("Peek is offline and offline cache is disabled");
        }

        // If we do have offline support
        const objectIds: number[] = await this.searchIndexLoader.getObjectIds(
            propertyName,
            keywordsString
        );

        if (objectIds.length == 0) {
            console.log(
                "There were no keyword search results for : " + keywordsString
            );
            return [];
        }

        let results: SearchResultObjectTuple[] =
            await this.searchObjectLoader.getObjects(objectTypeId, objectIds);

        results = this.filterAndRankObjectsForSearchString(
            results,
            keywordsString,
            propertyName
        );

        console.debug(
            `Completed search for |${keywordsString}|` +
                `, returning ${results.length} objects`
        );

        return this._loadObjectTypes(results);
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

    /** Rank and Filter Objects For Search String

        STAGE 2 of the search.

        This method filters the loaded objects to ensure we have full matches.

        :param results:
        :param searchString:
        :param propertyName:
        :return:
        */
    private filterAndRankObjectsForSearchString(
        results: SearchResultObjectTuple[],
        searchString: string,
        propertyName: string | null
    ): SearchResultObjectTuple[] {
        // Get the partial tokens, and match them
        const splitWords = searchString.toLowerCase().split(" ");

        const rankResult = (result: SearchResultObjectTuple): boolean => {
            let props = result.properties;
            if (propertyName != null && propertyName.length !== 0) {
                props = {};
                if (props.hasOwnProperty(propertyName))
                    props[propertyName] = props[propertyName];
            }

            const allPropVals =
                " " + Object.values(props).join(" ").toLowerCase();

            const matchedTokens = splitWords //
                .filter((w) => allPropVals.indexOf(" " + w) !== -1);

            if (matchedTokens.length < splitWords.length) {
                return false;
            }

            result.rank = 0;
            for (const p of allPropVals.split(" ")) {
                for (const w of splitWords) {
                    if (p.indexOf(w) === 0) result.rank += p.length - w.length;
                }
            }

            return true;
        };

        // Filter and set the rank
        return results //
            .filter(rankResult)
            .sort((a, b) => a.rank - b.rank);
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
