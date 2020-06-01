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
import {OfflineConfigTuple} from "../tuples/OfflineConfigTuple";
import {SearchTupleService} from "../SearchTupleService";
import {PrivateSearchIndexLoaderStatusTuple} from "./PrivateSearchIndexLoaderStatusTuple";
import {splitFullKeywords, splitPartialKeywords} from "../KeywordSplitter";


// ----------------------------------------------------------------------------

let clientSearchIndexWatchUpdateFromDeviceFilt = extend(
    {'key': "clientSearchIndexWatchUpdateFromDevice"},
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
let INDEX_BUCKET_COUNT = 8192;

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

    bucket = bucket & (INDEX_BUCKET_COUNT - 1);

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
    private UPDATE_CHUNK_FETCH_SIZE = 5;
    private OFFLINE_CHECK_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

    private index = new SearchIndexUpdateDateTuple();
    private askServerChunks: SearchIndexUpdateDateTuple[] = [];

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();
    private storage: TupleOfflineStorageService;

    private _statusSubject = new Subject<PrivateSearchIndexLoaderStatusTuple>();
    private _status = new PrivateSearchIndexLoaderStatusTuple();

    private offlineConfig: OfflineConfigTuple = new OfflineConfigTuple();

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                storageFactory: TupleStorageFactoryService,
                private tupleService: SearchTupleService) {
        super();

        this.tupleService.offlineObserver
            .subscribeToTupleSelector(new TupleSelector(OfflineConfigTuple.tupleName, {}),
                false, false, true)
            .takeUntil(this.onDestroyEvent)
            .filter(v => v.length != 0)
            .subscribe((tuples: OfflineConfigTuple[]) => {
                this.offlineConfig = tuples[0];
                if (this.offlineConfig.cacheChunksForOffline)
                    this.initialLoad();
                this._notifyStatus();
            });

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(searchIndexCacheStorageName)
        );

        this.setupVortexSubscriptions();
        this._notifyStatus();

        // Check for updates every so often
        Observable.interval(this.OFFLINE_CHECK_PERIOD_MS)
            .takeUntil(this.onDestroyEvent)
            .subscribe(() => this.askServerForUpdates());
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

    private _notifyStatus(): void {
        this._status.cacheForOfflineEnabled = this.offlineConfig.cacheChunksForOffline;
        this._status.initialLoadComplete = this.index.initialLoadComplete;

        this._status.loadProgress = Object.keys(this.index.updateDateByChunkKey).length;
        for (let chunk of this.askServerChunks)
            this._status.loadProgress -= Object.keys(chunk.updateDateByChunkKey).length;

        this._statusSubject.next(this._status);
    }


    /** Initial load
     *
     * Load the dates of the index buckets and ask the server if it has any updates.
     */
    private initialLoad(): void {

        this.storage.loadTuples(new UpdateDateTupleSelector())
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

    private areWeTalkingToTheServer(): boolean {
        return this.offlineConfig.cacheChunksForOffline
            && this.vortexStatusService.snapshot.isOnline;
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
                    if (!this.index.updateDateByChunkKey.hasOwnProperty(chunkKey)) {
                        this.index.updateDateByChunkKey[chunkKey] = null;
                        keysNeedingUpdate.push(chunkKey);

                    } else if (this.index.updateDateByChunkKey[chunkKey]
                        != serverIndex.updateDateByChunkKey[chunkKey]) {
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
            indexChunk.updateDateByChunkKey[key] = this.index.updateDateByChunkKey[key];
            count++;

            if (count == this.UPDATE_CHUNK_FETCH_SIZE) {
                this.askServerChunks.push(indexChunk);
                count = 0;
                indexChunk = new SearchIndexUpdateDateTuple();
            }
        }

        if (count)
            this.askServerChunks.push(indexChunk);

        this.askServerForNextUpdateChunk();

        this._status.lastCheck = new Date();
        this._notifyStatus();
    }

    private askServerForNextUpdateChunk() {
        if (!this.areWeTalkingToTheServer()) return;

        if (this.askServerChunks.length == 0)
            return;

        let indexChunk: SearchIndexUpdateDateTuple = this.askServerChunks.pop();
        let filt = extend({}, clientSearchIndexWatchUpdateFromDeviceFilt);
        filt[cacheAll] = true;
        let pl = new Payload(filt, [indexChunk]);
        this.vortexService.sendPayload(pl);

        this._status.lastCheck = new Date();
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

        payloadEnvelope
            .decodePayload()
            .then((payload: Payload) => this.storeSearchIndexPayload(payload))
            .then(() => {
                if (this.askServerChunks.length == 0) {
                    this.index.initialLoadComplete = true;
                    this._hasLoaded = true;
                    this._hasLoadedSubject.next();

                } else if (payloadEnvelope.filt[cacheAll] == true) {
                    this.askServerForNextUpdateChunk();

                }

            })
            .then(() => this._notifyStatus())
            .catch(e =>
                `SearchIndexCache.processSearchIndexesFromServer failed: ${e}`
            );

    }

    private storeSearchIndexPayload(payload: Payload) {

        let tuplesToSave: EncodedSearchIndexChunkTuple[] = <EncodedSearchIndexChunkTuple[]>payload.tuples;
        if (tuplesToSave.length == 0)
            return;

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
    getObjectIds(propertyName: string | null, searchString: string): Promise<number[]> {

        if (this.isReady())
            return this.getObjectIdsForSearchString(searchString, propertyName);

        return this.isReadyObservable()
            .first()
            .toPromise()
            .then(() => this.getObjectIdsForSearchString(searchString, propertyName));
    }


    /** Get Object IDs When Ready
     *
     * Get the objects with matching keywords from the index..
     *
     * This should match FastKeywordController.py
     */
    private async getObjectIdsForSearchString(searchString: string,
                                              propertyName: string | null): Promise<number[]> {

        // Split the keywords into full keywords
        const fullKwTokens = splitFullKeywords(searchString)

        // If there are no tokens then return nothing
        if (fullKwTokens == null || fullKwTokens.length == 0) {
            return [];
        }

        // First find all the results from the full kw tokens
        const resultsByFullKw: { [token: string]: number[] } = await this
            .loadObjectIdsFromIndex(fullKwTokens, propertyName);

        // Filter out the no matches
        for (let token of Object.keys(resultsByFullKw)) {
            if (resultsByFullKw[token] == null)
                delete resultsByFullKw[token];
        }

        // Get the remaining tokens to try the partial keyword search in
        const remainingSearchString = fullKwTokens
            .filter(kw => resultsByFullKw[kw] == null)
            .join(' ');

        // Now lookup any remaining keywords, if any
        const partialKwTokens = splitPartialKeywords(remainingSearchString);
        const resultsByPartialKw: { [token: string]: number[] } = await this
            .loadObjectIdsFromIndex(partialKwTokens, propertyName);

        // Merge the results
        const results = {};
        Object.assign(results, resultsByFullKw);
        Object.assign(results, resultsByPartialKw);

        // If there are no results, then return
        if (Object.keys(results).length !== 0)
            return []

        // Now, return the ObjectIDs that exist in all keyword lookups
        const keys = Object.keys(results);

        let objectIdsUnion: any = new Set<number>(results[keys.pop()]);
        for (let key of keys) {
            const thisSet = new Set<number>(results[key]);
            objectIdsUnion = new Set<number>([...objectIdsUnion]
                .filter(x => thisSet.has(x)));
        }

        // Limit to 50 and return
        return [...objectIdsUnion].slice(0, 50);
    }


    private async loadObjectIdsFromIndex(tokens: string[],
                                         propertyName: string | null): Promise<{ [token: string]: number[] }> {

        const tokensByChunkKey: { [chunkKey: number]: string[] } = {};

        // Group the keys for
        for (let token of tokens) {
            if (tokensByChunkKey[keywordChunk(token)] == null)
                tokensByChunkKey[keywordChunk(token)] = [];
            tokensByChunkKey[keywordChunk(token)].push(token);
        }

        const promises = [];
        for (let chunkKey of Object.keys(tokensByChunkKey)) {
            const tokensInChunk = tokensByChunkKey[chunkKey];
            const chunkKeyInt = parseInt(chunkKey.toString());
            promises.push(
                this.getObjectIdsForKeyword(propertyName, chunkKeyInt, tokensInChunk)
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
    private async getObjectIdsForKeyword(propertyName: string | null,
                                         chunkKey: number,
                                         tokens: string[]): Promise<{ [token: string]: number[] }> {
        if (tokens == null || tokens.length == 0) {
            throw new Error("We've been passed a null/empty keyword");
        }

        if (!this.index.updateDateByChunkKey.hasOwnProperty(chunkKey)) {
            console.log(`keyword: ${tokens} doesn't appear in the index`);
            return {};
        }

        const objectIdsByToken: { [token: string]: number[] } = {};

        const vortexMsg = await this.storage
            .loadTuplesEncoded(new SearchIndexChunkTupleSelector(chunkKey));

        if (vortexMsg == null)
            return {};

        const payload = await Payload.fromEncodedPayload(vortexMsg);
        const chunkData = payload.tuples;

        for (let token of tokens) {
            const objectIds = [];
            objectIdsByToken[token] = objectIds;

            // TODO Binary Search, the data IS sorted
            for (let keywordIndex of chunkData) {
                // Find the keyword, we're just iterating
                if (keywordIndex[0] != token)
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
        }

        return objectIdsByToken;

    }


}
