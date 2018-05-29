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
import {searchFilt, searchIndexCacheStorageName} from "@peek/peek_plugin_search/_private";


import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {
    EncodedSearchIndexChunkTuple,
    SearchIndexChunkTuple,
    SearchIndexUpdateDateTuple
} from "../tuples/search-index";


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

class SearchIndexChunkTupleSelector extends TupleSelector {
    constructor(chunkKey: string) {
        super(SearchIndexChunkTuple.tupleName, {key: chunkKey});
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

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                private storage: TupleOfflineStorageService) {
        super();
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

        let tuple = new SearchIndexUpdateDateTuple();
        tuple.updateDateByChunkKey = this.index.updateDateByChunkKey;

        let payload = new Payload(clientSearchIndexWatchUpdateFromDeviceFilt, [tuple]);
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

        let tuplesToSave = [];

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
                            encodedSearchIndexChunkTuple.encodedPayload
                        )
                    );
                }

                return Promise.all(promises)
                    .then(() => tx.close());
            });
        return retPromise;
    }


}