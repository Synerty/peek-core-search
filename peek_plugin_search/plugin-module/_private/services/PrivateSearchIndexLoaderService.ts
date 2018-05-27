import {Injectable} from "@angular/core";
import {SearchIndexTuple} from "../tuples/SearchIndexTuple";

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
import {
    diagramFilt,
    searchIndexCacheStorageName
} from "@peek/peek_plugin_diagram/_private";


import {SearchIndexUpdateDateTuple} from "../tuples/SearchIndexUpdateDateTuple";
import {DispKeySearchTuple} from "../tuples/DispSearchTuple";
import {PrivateDiagramCoordSetService} from "./PrivateDiagramCoordSetService";

import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {EncodedSearchIndexTuple} from "../tuples/EncodedSearchIndexTuple";

let pako = require("pako");


// ----------------------------------------------------------------------------

let clientSearchIndexWatchUpdateFromDeviceFilt = extend(
    {'key': "clientSearchIndexWatchUpdateFromDevice"},
    diagramFilt
);

// ----------------------------------------------------------------------------
/** SearchIndexTupleSelector
 */
class SearchIndexTupleSelector extends TupleSelector {
    constructor(indexBucket: string) {
        super(SearchIndexTuple.tupleName, {key: indexBucket});
    }
}

// ----------------------------------------------------------------------------
/** LastUpdateTupleSelector
 */
class UpdateDateTupleSelector extends TupleSelector {
    constructor(modelSetKey: string) {
        super(SearchIndexUpdateDateTuple.tupleName, {
            modelSetKey: modelSetKey
        });
    }
}


// ----------------------------------------------------------------------------
/** hash method
 */
function dispKeyHashBucket(modelSetKey: string, dispKey: string): string {
    /** Disp Key Hash Bucket

     This method create an int from 0 to 255, representing the hash bucket for this
     key.

     This is simple, and provides a reasonable distribution

     @param modelSetKey:
     @param dispKey:

     @return:

     */
    if (modelSetKey == null || modelSetKey.length == 0)
        throw new Error("modelSetkey is None or zero length");

    if (dispKey == null || dispKey.length == 0)
        throw new Error("dispKey is None or zero length");

    let hash = 0;

    for (let i = 0; i < dispKey.length; i++) {
        hash = ((hash << 5) - hash) + dispKey.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    hash = hash & 1023; // 1024 buckets

    return `${modelSetKey}:${hash}`;
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
export class PrivateSearchIndexLoaderService {

    private indexByModelSet = {};
    private storage: TupleOfflineStorageService;

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                storageFactory: TupleStorageFactoryService,
                private coordSetService: PrivateDiagramCoordSetService) {

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(searchIndexCacheStorageName)
        );

    }

    indexForModelSetKey(modelSetKey: string): Promise<SearchIndex> {
        let newIndex: SearchIndex | null = null;

        if (this.indexByModelSet.hasOwnProperty(modelSetKey)) {
            newIndex = this.indexByModelSet[modelSetKey];
            if (newIndex.isReady())
                return Promise.resolve(newIndex);

        } else {
            newIndex = new SearchIndex(
                this.vortexService,
                this.vortexStatusService,
                this.storage,
                modelSetKey,
                this.coordSetService
            );
            this.indexByModelSet[modelSetKey] = newIndex;
        }

        return new Promise<SearchIndex>((resolve, reject) => {
            newIndex.isReadyObservable()
                .first()
                .subscribe(() => {
                    resolve(newIndex);
                });
        });
    }


}

export class SearchIndex {

    private index = new SearchIndexUpdateDateTuple();

    private lifecycleEmitter = new ComponentLifecycleEventEmitter();

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                private storage: TupleOfflineStorageService,
                private modelSetKey: string,
                private coordSetService: PrivateDiagramCoordSetService) {
        this.index.modelSetKey = this.modelSetKey;
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

        this.storage.loadTuples(new UpdateDateTupleSelector(this.modelSetKey))
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

        let filt = extend({modelSetKey: this.modelSetKey},
            clientSearchIndexWatchUpdateFromDeviceFilt);

        // Services don't have destructors, I'm not sure how to unsubscribe.
        this.vortexService.createEndpointObservable(this.lifecycleEmitter, filt)
            .takeUntil(this.lifecycleEmitter.onDestroyEvent)
            .subscribe((payloadEnvelope: PayloadEnvelope) => {
                this.processSearchIndexesFromServer(payloadEnvelope);
            });

        // If the vortex service comes back online, update the watch grids.
        this.vortexStatusService.isOnline
            .filter(isOnline => isOnline == true)
            .takeUntil(this.lifecycleEmitter.onDestroyEvent)
            .subscribe(() => this.askServerForUpdates());

    }


    //
    private askServerForUpdates() {
        // There is no point talking to the server if it's offline
        if (!this.vortexStatusService.snapshot.isOnline)
            return;

        let tuple = new SearchIndexUpdateDateTuple();
        tuple.indexBucketUpdateDates = this.index.indexBucketUpdateDates;

        let filt = extend({modelSetKey: this.modelSetKey},
            clientSearchIndexWatchUpdateFromDeviceFilt);

        let payload = new Payload(filt, [tuple]);
        this.vortexService.sendPayload(payload);
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

            this.storage.saveTuples(
                new UpdateDateTupleSelector(this.modelSetKey), [this.index]
            )
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

        let encodedSearchIndexTuples: EncodedSearchIndexTuple[] = <EncodedSearchIndexTuple[]>payload.tuples;

        let tuplesToSave = [];

        for (let item of encodedSearchIndexTuples) {
            tuplesToSave.push(item);
        }


        // 2) Store the index
        this.storeSearchIndexTuples(tuplesToSave)
            .then(() => {
                // 3) Store the update date

                for (let searchIndex of tuplesToSave) {
                    this.index.indexBucketUpdateDates[searchIndex.indexBucket] = searchIndex.lastUpdate;
                }

                return this.storage.saveTuples(
                    new UpdateDateTupleSelector(this.modelSetKey), [this.index]
                );

            })
            .catch(e => console.log(
                `SearchIndexCache.storeSearchIndexPayload: ${e}`));

    }

    /** Store Index Bucket
     * Stores the index bucket in the local db.
     */
    private storeSearchIndexTuples(encodedSearchIndexTuples: EncodedSearchIndexTuple[]): Promise<void> {
        let retPromise: any;
        retPromise = this.storage.transaction(true)
            .then((tx) => {

                let promises = [];

                for (let encodedSearchIndexTuple of encodedSearchIndexTuples) {
                    promises.push(
                        tx.saveTuplesEncoded(
                            new SearchIndexTupleSelector(encodedSearchIndexTuple.indexBucket),
                            encodedSearchIndexTuple.encodedSearchIndexTuple
                        )
                    );
                }

                return Promise.all(promises)
                    .then(() => tx.close());
            });
        return retPromise;
    }

    /** Get Searchs
     *
     * Get the search of a Disp.key from the index..
     *
     */
    getSearchs(dispKey: string): Promise<DispKeySearchTuple[]> {
        if (dispKey == null || dispKey.length == 0) {
            let val: DispKeySearchTuple[] = [];
            return Promise.resolve(val);
        }

        let indexBucket = dispKeyHashBucket(this.modelSetKey, dispKey);

        if (!this.index.indexBucketUpdateDates.hasOwnProperty(indexBucket)) {
            console.log(`DispKey ${dispKey} doesn't appear in the index`);
            return Promise.resolve([]);
        }

        let retPromise: any;
        retPromise = this.storage.loadTuples(new SearchIndexTupleSelector(indexBucket))
            .then((tuples: SearchIndexTuple[]) => {
                if (tuples.length == 0)
                    return [];

                if (tuples.length != 1)
                    throw new Error("We received more tuples then expected");

                let dispIndexArray = JSON.parse(tuples[0].jsonStr);

                let dispSearchIndexRawData: any[] | null = null;

                // TODO These keys are sorted, so we can do a binary search.
                for (let i = 0; i < dispIndexArray.length; i++) {
                    if (dispIndexArray[i][0] == dispKey) {
                        dispSearchIndexRawData = dispIndexArray[i].slice(1);
                        break;
                    }
                }

                // If we didn't find the key, return no indexes
                if (dispSearchIndexRawData == null)
                    return [];

                let dispIndexes: DispKeySearchTuple[] = [];
                for (let rawData of dispSearchIndexRawData) {
                    let dispSearch = DispKeySearchTuple.fromSearchJson(rawData);

                    let coordSet = this.coordSetService
                        .coordSetForId(dispSearch.coordSetId);

                    if (coordSet == null)
                        continue;

                    dispSearch.coordSetKey = coordSet.key;

                    dispIndexes.push(dispSearch);
                }

                return dispIndexes;
            });
        return retPromise;

    }

}