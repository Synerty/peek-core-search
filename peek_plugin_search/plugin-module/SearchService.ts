import {Injectable} from "@angular/core";


import {
    ComponentLifecycleEventEmitter,
    extend,
    Payload,
    PayloadEnvelope,
    TupleOfflineStorageNameService,
    TupleOfflineStorageService,
    TupleSelector,
    TupleStorageFactoryService,
    VortexService,
    VortexStatusService
} from "@synerty/vortexjs";


import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {PrivateSearchIndexLoaderService} from "./_private/search-index-loader";
import {PrivateSearchObjectLoaderService} from "./_private/search-object-loader";

import {SearchResultObjectTuple} from "./SearchResultObjectTuple";
import {SearchTupleService} from "./_private/SearchTupleService";
import {OfflineConfigTuple} from "./_private/tuples/OfflineConfigTuple";


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
    private punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

    private offlineConfig: OfflineConfigTuple = new OfflineConfigTuple();

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

    }

    /** Split Keywords
     *
     * This MUST MATCH the code that runs in the worker
     * peek_plugin_search/_private/worker/tasks/ImportSearchIndexTask.py
     *
     * @param {string} keywordStr: The keywords as one string
     * @returns {string[]} The keywords as an array
     */
    private splitKeywords(keywordStr: string): string[] {
        // Lowercase the string
        keywordStr = keywordStr.toLowerCase();

        // Remove punctuation
        let nonPunct = '';
        for (let char of keywordStr) {
            if (this.punctuation.indexOf(char) == -1)
                nonPunct += char;
        }

        // Split the stirng into words
        let words = nonPunct.split(' ');

        // Strip the words
        words = words.map((w: string) => w.replace(/^\s+|\s+$/g, ''));

        // Filter out the empty words
        words = words.filter((w: string) => w.length != 0);

        // return - nicely commented
        return words;


    }


    /** Get Locations
     *
     * Get the objects with matching keywords from the index..
     *
     */
    getObjects(propertyName: string | null,
               objectTypeId: number | null,
               keywordsString: string): Promise<SearchResultObjectTuple[]> {

        let keywords = this.splitKeywords(keywordsString);
        console.log(keywords);

        if (!this.offlineConfig.cacheChunksForOffline) {
            let ts = new TupleSelector(SearchResultObjectTuple.tupleName, {
                "propertyName": propertyName,
                "objectTypeId": objectTypeId,
                "keywords": keywords
            });

            let isOnlinePromise: any = this.vortexStatusService.snapshot.isOnline ?
                Promise.resolve() :
                this.vortexStatusService.isOnline.filter(online => online).toPromise();

            return isOnlinePromise
                .then(() => this.tupleService.offlineObserver.pollForTuples(ts, false));
        }

        return this.searchIndexLoader.getObjectIds(propertyName, keywords)
            .then((objectIds: number[]) => {
                if (objectIds.length == 0) {
                    console.log("There were no keyword search results for : " + keywords);
                    return [];
                }

                // Limit to 20 results
                objectIds = objectIds.slice(0, 20);

                return this.searchObjectLoader.getObjects(objectTypeId, objectIds);
            })

    }

}