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
import {searchFilt, searchIndexCacheStorageName, searchTuplePrefix} from "../PluginNames";


import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";

import {EncodedSearchIndexChunkTuple} from "./EncodedSearchIndexChunkTuple";
import {SearchIndexUpdateDateTuple} from "./SearchIndexUpdateDateTuple";


// ----------------------------------------------------------------------------

let clientSearchIndexWatchUpdateFromDeviceFilt = extend(
    {'key': "clientSearchIndexWatchUpdateFromDevice"},
    searchFilt
);

// ----------------------------------------------------------------------------
/** SearchIndexChunkTupleSelector
 *
 * This is just a short cut for the tuple selector
 */

// There is actually no tuple here, it's raw JSON,
// so we don't have to construct a class to get the data
class SearchIndexChunkTupleSelector extends TupleSelector {

    constructor(private chunkKey: number) {
        super(searchTuplePrefix + "SearchIndexChunkTuple", {key: chunkKey});
    }

    toOrderedJsonStr(): string {
        return this.chunkKey.toString();
    }
}

// ----------------------------------------------------------------------------
/** UpdateDateTupleSelector
 *
 * This is just a short cut for the tuple selector
 */
class UpdateDateTupleSelector extends TupleSelector {
    constructor() {
        super(SearchIndexUpdateDateTuple.tupleName, {});
    }
}


// ----------------------------------------------------------------------------
/** hash method
 */
function keywordChunk(keyword: string): number {
    /** keyword

     This method creates an int from 0 to MAX, representing the hash bucket for this
     keyword.

     This is simple, and provides a reasonable distribution

     @param keyword: The keyword to get the chunk key for

     @return: The bucket / chunkKey where you'll find the keyword

     */
    if (keyword == null || keyword.length == 0)
        throw new Error("keyword is None or zero length");

    let bucket = 0;

    for (let i = 0; i < keyword.length; i++) {
        bucket = ((bucket << 5) - bucket) + keyword.charCodeAt(i);
        bucket |= 0; // Convert to 32bit integer
    }

    bucket = bucket & 1023; // 1024 buckets

    return bucket;
}


// ----------------------------------------------------------------------------
/** SearchIndex Cache
 *
 * This class has the following responsibilities:
 *
 * 1) Maintain a local storage of the index
 *
 * 2) Return DispKey searchs based on the index.
 *
 */
@Injectable()
export class PrivateSearchIndexLoaderService extends ComponentLifecycleEventEmitter {

    private index = new SearchIndexUpdateDateTuple();

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();
    private storage: TupleOfflineStorageService;

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                storageFactory: TupleStorageFactoryService) {
        super();

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(searchIndexCacheStorageName)
        );

        this.initialLoad();


    }

    isReady(): boolean {
        return this._hasLoaded;
    }

    isReadyObservable(): Observable<void> {
        return this._hasLoadedSubject;
    }

    /** Initial load
     *
     * Load the dates of the index buckets and ask the server if it has any updates.
     */
    private initialLoad(): void {

        this.storage.loadTuples(new UpdateDateTupleSelector())
            .then((tuples: SearchIndexUpdateDateTuple[]) => {
                if (tuples.length != 0) {
                    this.index = tuples[0];

                    if (this.index.initialLoadComplete) {
                        this._hasLoaded = true;
                        this._hasLoadedSubject.next();
                    }

                }

                this.setupVortexSubscriptions();
                this.askServerForUpdates();

            });

    }

    private setupVortexSubscriptions(): void {

        // Services don't have destructors, I'm not sure how to unsubscribe.
        this.vortexService.createEndpointObservable(this, clientSearchIndexWatchUpdateFromDeviceFilt)
            .takeUntil(this.onDestroyEvent)
            .subscribe((payloadEnvelope: PayloadEnvelope) => {
                this.processSearchIndexesFromServer(payloadEnvelope);
            });

        // If the vortex service comes back online, update the watch grids.
        this.vortexStatusService.isOnline
            .filter(isOnline => isOnline == true)
            .takeUntil(this.onDestroyEvent)
            .subscribe(() => this.askServerForUpdates());

    }


    //
    private askServerForUpdates() {
        // There is no point talking to the server if it's offline
        if (!this.vortexStatusService.snapshot.isOnline)
            return;

        let pl = new Payload(clientSearchIndexWatchUpdateFromDeviceFilt, [this.index]);
        this.vortexService.sendPayload(pl);
    }


    /** Process SearchIndexes From Server
     *
     * Process the grids the server has sent us.
     */
    private processSearchIndexesFromServer(payloadEnvelope: PayloadEnvelope) {
        if (payloadEnvelope.result != null && payloadEnvelope.result != true) {
            console.log(`ERROR: ${payloadEnvelope.result}`);
            return;
        }

        if (payloadEnvelope.filt["finished"] == true) {
            this.index.initialLoadComplete = true;

            this.storage.saveTuples(new UpdateDateTupleSelector(), [this.index])
                .then(() => {
                    this._hasLoaded = true;
                    this._hasLoadedSubject.next();
                })
                .catch(err => console.log(`ERROR : ${err}`));

            return;
        }

        payloadEnvelope
            .decodePayload()
            .then((payload: Payload) => this.storeSearchIndexPayload(payload))
            .catch(e =>
                `SearchIndexCache.processSearchIndexesFromServer failed: ${e}`
            );

    }

    private storeSearchIndexPayload(payload: Payload) {

        let encodedSearchIndexChunkTuples: EncodedSearchIndexChunkTuple[] = <EncodedSearchIndexChunkTuple[]>payload.tuples;

        let tuplesToSave: EncodedSearchIndexChunkTuple[] = [];

        for (let item of encodedSearchIndexChunkTuples) {
            tuplesToSave.push(item);
        }

        // 2) Store the index
        this.storeSearchIndexChunkTuples(tuplesToSave)
            .then(() => {
                // 3) Store the update date

                for (let searchIndex of tuplesToSave) {
                    this.index.updateDateByChunkKey[searchIndex.chunkKey] = searchIndex.lastUpdate;
                }

                return this.storage.saveTuples(
                    new UpdateDateTupleSelector(), [this.index]
                );

            })
            .catch(e => console.log(
                `SearchIndexCache.storeSearchIndexPayload: ${e}`));

    }

    /** Store Index Bucket
     * Stores the index bucket in the local db.
     */
    private storeSearchIndexChunkTuples(encodedSearchIndexChunkTuples: EncodedSearchIndexChunkTuple[]): Promise<void> {
        let retPromise: any;
        retPromise = this.storage.transaction(true)
            .then((tx) => {

                let promises = [];

                for (let encodedSearchIndexChunkTuple of encodedSearchIndexChunkTuples) {
                    promises.push(
                        tx.saveTuplesEncoded(
                            new SearchIndexChunkTupleSelector(encodedSearchIndexChunkTuple.chunkKey),
                            encodedSearchIndexChunkTuple.encodedData
                        )
                    );
                }

                return Promise.all(promises)
                    .then(() => tx.close());
            });
        return retPromise;
    }


    /** Get Object IDs
     *
     * Get the objects with matching keywords from the index..
     *
     */
    getObjectIds(propertyName: string | null, keywords: string[]): Promise<number[]> {
        if (keywords == null || keywords.length == 0) {
            throw new Error("We've been passed a null/empty keywords");
        }

        if (this.isReady())
            return this.getObjectIdsWhenReady(propertyName, keywords);

        return this.isReadyObservable()
            .toPromise()
            .then(() => this.getObjectIdsWhenReady(propertyName, keywords));
    }


    /** Get Object IDs When Ready
     *
     * Get the objects with matching keywords from the index..
     *
     */
    private getObjectIdsWhenReady(propertyName: string | null, keywords: string[]): Promise<number[]> {
        let promises = [];
        for (let keyword of keywords) {
            promises.push(this.getObjectIdsForKeyword(propertyName, keyword));
        }

        return Promise.all(promises)
            .then((results: number[][]) => {
                let objectIds: number[] = [];
                for (let result of results) {
                    objectIds.add(result);
                }
                return objectIds;
            });
    }


    /** Get Object IDs for Keyword
     *
     * Get the objects with matching keywords from the index..
     *
     */
    private getObjectIdsForKeyword(propertyName: string | null, keyword: string): Promise<number[]> {
        if (keyword == null || keyword.length == 0) {
            throw new Error("We've been passed a null/empty keyword");
        }

        let chunkKey: number = keywordChunk(keyword);

        if (!this.index.updateDateByChunkKey.hasOwnProperty(chunkKey)) {
            console.log(`keyword: ${keyword} doesn't appear in the index`);
            return Promise.resolve([]);
        }

        let retPromise: any;
        retPromise = this.storage.loadTuplesEncoded(new SearchIndexChunkTupleSelector(chunkKey))
            .then((vortexMsg: string) => {
                if (vortexMsg == null) {
                    return [];
                }

                return Payload.fromEncodedPayload(vortexMsg)
                    .then((payload: Payload) => payload.tuples)
                    .then((chunkData: string[][]) => {
                        let objectIds = [];

                        // TODO Binary Search, the data IS sorted
                        for (let keywordIndex of chunkData) {
                            // Find the keyword, we're just iterating
                            if (keywordIndex[0] != keyword)
                                continue;

                            // If the property is set, then make sure it matches
                            if (propertyName != null && keywordIndex[1] != propertyName)
                                continue;

                            // This is stored as a string, so we don't have to construct
                            // so much data when deserialising the chunk
                            let thisObjectIds = JSON.parse(keywordIndex[2]);
                            for (let thisObjectId of thisObjectIds) {
                                objectIds.push(thisObjectId);
                            }
                        }

                        return objectIds;

                    });
            });
        return retPromise;

    }


}