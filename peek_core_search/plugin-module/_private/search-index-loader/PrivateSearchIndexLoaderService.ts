import { Observable, Subject } from "rxjs";
import { filter, first, takeUntil } from "rxjs/operators";
import { Injectable } from "@angular/core";
import {
    extend,
    NgLifeCycleEvents,
    Payload,
    PayloadEnvelope,
    TupleOfflineStorageNameService,
    TupleOfflineStorageService,
    TupleSelector,
    TupleStorageFactoryService,
    VortexService,
    VortexStatusService,
    TupleStorageBatchSaveArguments,
} from "@synerty/vortexjs";
import {
    searchFilt,
    searchIndexCacheStorageName,
    searchTuplePrefix,
} from "../PluginNames";

import { EncodedSearchIndexChunkTuple } from "./EncodedSearchIndexChunkTuple";
import { SearchIndexUpdateDateTuple } from "./SearchIndexUpdateDateTuple";
import { SearchTupleService } from "../SearchTupleService";
import { PrivateSearchIndexLoaderStatusTuple } from "./PrivateSearchIndexLoaderStatusTuple";

import {
    DeviceOfflineCacheService,
    OfflineCacheStatusTuple,
} from "@peek/peek_core_device";

// ----------------------------------------------------------------------------

let clientSearchIndexWatchUpdateFromDeviceFilt = extend(
    { key: "clientSearchIndexWatchUpdateFromDevice" },
    searchFilt
);

const cacheAll = "cacheAll";

// ----------------------------------------------------------------------------
/** SearchIndexChunkTupleSelector
 *
 * This is just a short cut for the tuple selector
 */

// There is actually no tuple here, it's raw JSON,
// so we don't have to construct a class to get the data
class SearchIndexChunkTupleSelector extends TupleSelector {
    constructor(private chunkKey: string) {
        super(searchTuplePrefix + "SearchIndexChunkTuple", { key: chunkKey });
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
let INDEX_BUCKET_COUNT = 8192;

function keywordChunk(keyword: string): string {
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
        bucket = (bucket << 5) - bucket + keyword.charCodeAt(i);
        bucket |= 0; // Convert to 32bit integer
    }

    return (bucket & (INDEX_BUCKET_COUNT - 1)).toString();
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
export class PrivateSearchIndexLoaderService extends NgLifeCycleEvents {
    private UPDATE_CHUNK_FETCH_SIZE = 5;

    // Every 100 chunks from the server
    private SAVE_POINT_ITERATIONS = 100;

    // Saving the cache after each chunk is so expensive, we only do it every 20 or so
    private chunksSavedSinceLastIndexSave = 0;

    private index = new SearchIndexUpdateDateTuple();
    private askServerChunks: SearchIndexUpdateDateTuple[] = [];

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();
    private storage: TupleOfflineStorageService;

    private _statusSubject = new Subject<PrivateSearchIndexLoaderStatusTuple>();
    private _status = new PrivateSearchIndexLoaderStatusTuple();

    constructor(
        private vortexService: VortexService,
        private vortexStatusService: VortexStatusService,
        storageFactory: TupleStorageFactoryService,
        private tupleService: SearchTupleService,
        private deviceCacheControllerService: DeviceOfflineCacheService
    ) {
        super();

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(searchIndexCacheStorageName)
        );

        this.setupVortexSubscriptions();
        this._notifyStatus();

        this.deviceCacheControllerService.triggerCachingObservable
            .pipe(takeUntil(this.onDestroyEvent))
            .pipe(filter((v) => v))
            .subscribe(() => {
                this.initialLoad();
                this._notifyStatus();
            });
    }

    isReady(): boolean {
        return this._hasLoaded;
    }

    isReadyObservable(): Observable<void> {
        return this._hasLoadedSubject;
    }

    statusObservable(): Observable<PrivateSearchIndexLoaderStatusTuple> {
        return this._statusSubject;
    }

    status(): PrivateSearchIndexLoaderStatusTuple {
        return this._status;
    }

    /** Get Object IDs
     *
     * Get the objects with matching keywords from the index..
     *
     */
    getObjectIds(
        tokens: string[],
        propertyName: string | null
    ): Promise<{ [token: string]: number[] }> {
        if (this.isReady())
            return this._getObjectIdsForTokens(tokens, propertyName);

        return this.isReadyObservable()
            .pipe(first())
            .toPromise()
            .then(() => this._getObjectIdsForTokens(tokens, propertyName));
    }

    private _notifyStatus(): void {
        this._status.cacheForOfflineEnabled =
            this.deviceCacheControllerService.cachingEnabled;
        this._status.initialLoadComplete = this.index.initialLoadComplete;

        this._status.loadProgress = Object.keys(
            this.index.updateDateByChunkKey
        ).length;
        for (let chunk of this.askServerChunks)
            this._status.loadProgress -= Object.keys(
                chunk.updateDateByChunkKey
            ).length;

        this._statusSubject.next(this._status);

        const status = new OfflineCacheStatusTuple();
        status.pluginName = "peek_core_search";
        status.indexName = "Keyword Index";
        status.loadingQueueCount = this._status.loadProgress;
        status.totalLoadedCount = this._status.loadTotal;
        status.lastCheckDate = new Date();
        status.initialFullLoadComplete = this._status.initialLoadComplete;
        this.deviceCacheControllerService.updateCachingStatus(status);
    }

    /** Initial load
     *
     * Load the dates of the index buckets and ask the server if it has any updates.
     */
    private initialLoad(): void {
        this.storage
            .loadTuples(new UpdateDateTupleSelector())
            .then((tuplesAny: any[]) => {
                let tuples: SearchIndexUpdateDateTuple[] = tuplesAny;
                if (tuples.length != 0) {
                    this.index = tuples[0];

                    if (this.index.initialLoadComplete) {
                        this._hasLoaded = true;
                        this._hasLoadedSubject.next();
                    }
                }

                this.askServerForUpdates();
                this._notifyStatus();
            });

        this._notifyStatus();
    }

    private setupVortexSubscriptions(): void {
        // Services don't have destructors, I'm not sure how to unsubscribe.
        this.vortexService
            .createEndpointObservable(
                this,
                clientSearchIndexWatchUpdateFromDeviceFilt
            )
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((payloadEnvelope: PayloadEnvelope) => {
                this.processChunksFromServer(payloadEnvelope);
            });

        // If the vortex service comes back online, update the watch grids.
        this.vortexStatusService.isOnline
            .pipe(filter((isOnline) => isOnline == true))
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe(() => this.askServerForUpdates());
    }

    private areWeTalkingToTheServer(): boolean {
        return (
            this.deviceCacheControllerService.offlineModeEnabled &&
            this.vortexStatusService.snapshot.isOnline
        );
    }

    /** Ask Server For Updates
     *
     * Tell the server the state of the chunks in our index and ask if there
     * are updates.
     *
     */
    private askServerForUpdates() {
        if (!this.areWeTalkingToTheServer()) return;

        // If we're still caching, then exit
        if (this.askServerChunks.length != 0) {
            this.askServerForNextUpdateChunk();
            return;
        }

        this.tupleService.observer
            .pollForTuples(new UpdateDateTupleSelector())
            .then((tuplesAny: any) => {
                let serverIndex: SearchIndexUpdateDateTuple = tuplesAny[0];
                let keys = Object.keys(serverIndex.updateDateByChunkKey);
                let keysNeedingUpdate: string[] = [];

                this._status.loadTotal = keys.length;

                // Tuples is an array of strings
                for (let chunkKey of keys) {
                    if (
                        !this.index.updateDateByChunkKey.hasOwnProperty(
                            chunkKey
                        )
                    ) {
                        this.index.updateDateByChunkKey[chunkKey] = null;
                        keysNeedingUpdate.push(chunkKey);
                    } else if (
                        this.index.updateDateByChunkKey[chunkKey] !=
                        serverIndex.updateDateByChunkKey[chunkKey]
                    ) {
                        keysNeedingUpdate.push(chunkKey);
                    }
                }
                this.queueChunksToAskServer(keysNeedingUpdate);
            });
    }

    /** Queue Chunks To Ask Server
     *
     */
    private queueChunksToAskServer(keysNeedingUpdate: string[]) {
        if (!this.areWeTalkingToTheServer()) return;

        this.askServerChunks = [];

        let count = 0;
        let indexChunk = new SearchIndexUpdateDateTuple();

        for (let key of keysNeedingUpdate) {
            indexChunk.updateDateByChunkKey[key] =
                this.index.updateDateByChunkKey[key] || "";
            count++;

            if (count == this.UPDATE_CHUNK_FETCH_SIZE) {
                this.askServerChunks.push(indexChunk);
                count = 0;
                indexChunk = new SearchIndexUpdateDateTuple();
            }
        }

        if (count) this.askServerChunks.push(indexChunk);

        this.askServerForNextUpdateChunk();

        this._status.lastCheck = new Date();
        this._notifyStatus();
    }

    private askServerForNextUpdateChunk() {
        if (!this.areWeTalkingToTheServer()) return;

        if (this.askServerChunks.length == 0) return;

        this.deviceCacheControllerService //
            .waitForGarbageCollector()
            .then(() => {
                let indexChunk: SearchIndexUpdateDateTuple =
                    this.askServerChunks.pop();
                let filt = extend(
                    {},
                    clientSearchIndexWatchUpdateFromDeviceFilt
                );
                filt[cacheAll] = true;
                let pl = new Payload(filt, [indexChunk]);
                this.vortexService.sendPayload(pl);

                this._status.lastCheck = new Date();
                this._notifyStatus();
            });
    }

    /** Process SearchIndexes From Server
     *
     * Process the grids the server has sent us.
     */
    private async processChunksFromServer(
        payloadEnvelope: PayloadEnvelope
    ): Promise<void> {
        if (payloadEnvelope.result != null && payloadEnvelope.result != true) {
            console.log(`ERROR: ${payloadEnvelope.result}`);
            return;
        }

        const tuplesToSave: EncodedSearchIndexChunkTuple[] = <
            EncodedSearchIndexChunkTuple[]
        >payloadEnvelope.data;

        try {
            await this.storeChunkTuples(tuplesToSave);
        } catch (e) {
            console.log(`SearchIndexCache.storeSearchIndexPayload: ${e}`);
        }

        if (this.askServerChunks.length == 0) {
            this.index.initialLoadComplete = true;
            await this.saveChunkCacheIndex(true);
            this._hasLoaded = true;
            this._hasLoadedSubject.next();
        } else if (payloadEnvelope.filt[cacheAll] == true) {
            this.askServerForNextUpdateChunk();
        }

        this._notifyStatus();
    }

    /** Store Index Bucket
     * Stores the index bucket in the local db.
     */
    private async storeChunkTuples(
        tuplesToSave: EncodedSearchIndexChunkTuple[]
    ): Promise<void> {
        // noinspection BadExpressionStatementJS
        const Selector = SearchIndexChunkTupleSelector;

        if (tuplesToSave.length == 0) return;

        const batchStore: TupleStorageBatchSaveArguments[] = [];
        for (const tuple of tuplesToSave) {
            batchStore.push({
                tupleSelector: new Selector(tuple.chunkKey),
                vortexMsg: tuple.encodedData,
            });
        }

        await this.storage.batchSaveTuplesEncoded(batchStore);

        for (const tuple of tuplesToSave) {
            this.index.updateDateByChunkKey[tuple.chunkKey] = tuple.lastUpdate;
        }
        await this.saveChunkCacheIndex(true);
    }

    /** Store Chunk Cache Index
     *
     * Updates our running tab of the update dates of the cached chunks
     *
     */
    private async saveChunkCacheIndex(force = false): Promise<void> {
        if (
            this.chunksSavedSinceLastIndexSave <= this.SAVE_POINT_ITERATIONS &&
            !force
        ) {
            return;
        }

        this.chunksSavedSinceLastIndexSave = 0;

        await this.storage.saveTuples(new UpdateDateTupleSelector(), [
            this.index,
        ]);
    }

    private async _getObjectIdsForTokens(
        tokens: string[],
        propertyName: string | null
    ): Promise<{ [token: string]: number[] }> {
        const tokensByChunkKey: { [chunkKey: string]: string[] } = {};

        // Group the keys for
        for (let token of tokens) {
            if (tokensByChunkKey[keywordChunk(token)] == null)
                tokensByChunkKey[keywordChunk(token)] = [];
            tokensByChunkKey[keywordChunk(token)].push(token);
        }

        const promises = [];
        for (let chunkKey of Object.keys(tokensByChunkKey)) {
            const tokensInChunk = tokensByChunkKey[chunkKey];
            promises.push(
                this._getObjectIdsForTokensForChunk(
                    tokensInChunk,
                    propertyName,
                    chunkKey
                )
            );
        }

        const allResults = await Promise.all(promises);
        const mergedResults: { [token: string]: number[] } = {};
        for (let results of allResults) {
            Object.assign(mergedResults, results);
        }

        return mergedResults;
    }

    /** Get Object IDs for Keyword
     *
     * Get the objects with matching keywords from the index..
     *
     */
    private async _getObjectIdsForTokensForChunk(
        tokens: string[],
        propertyName: string | null,
        chunkKey: string
    ): Promise<{ [token: string]: number[] }> {
        if (tokens == null || tokens.length == 0) {
            throw new Error("We've been passed a null/empty keyword");
        }

        if (!this.index.updateDateByChunkKey.hasOwnProperty(chunkKey)) {
            console.log(`keyword: ${tokens} doesn't appear in the index`);
            return {};
        }

        const objectIdsByToken: { [token: string]: number[] } = {};

        const vortexMsg = await this.storage.loadTuplesEncoded(
            new SearchIndexChunkTupleSelector(chunkKey)
        );

        if (vortexMsg == null) return {};

        const payload = await Payload.fromEncodedPayload(vortexMsg);
        const chunkData = payload.tuples;

        for (let token of tokens) {
            const objectIds = [];
            objectIdsByToken[token] = objectIds;

            // TODO Binary Search, the data IS sorted
            for (let keywordIndex of chunkData) {
                // Find the keyword, we're just iterating
                if (keywordIndex[0] != token) continue;

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
        }

        return objectIdsByToken;
    }
}
