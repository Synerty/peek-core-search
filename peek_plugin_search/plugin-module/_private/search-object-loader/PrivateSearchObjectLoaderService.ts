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

import {
    searchFilt,
    searchObjectCacheStorageName,
    searchTuplePrefix
} from "../PluginNames";


import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {EncodedSearchObjectChunkTuple} from "./EncodedSearchObjectChunkTuple";
import {SearchObjectUpdateDateTuple} from "./SearchObjectUpdateDateTuple";


// ----------------------------------------------------------------------------

let clientSearchObjectWatchUpdateFromDeviceFilt = extend(
    {'key': "clientSearchObjectWatchUpdateFromDevice"},
    searchFilt
);

// ----------------------------------------------------------------------------
/** SearchObjectChunkTupleSelector
 *
 * This is just a short cut for the tuple selector
 */

class SearchObjectChunkTupleSelector extends TupleSelector {
    constructor(chunkKey: string) {
        super(searchTuplePrefix + "SearchObjectChunkTuple", {key: chunkKey});
    }
}

// ----------------------------------------------------------------------------
/** UpdateDateTupleSelector
 *
 * This is just a short cut for the tuple selector
 */
class UpdateDateTupleSelector extends TupleSelector {
    constructor() {
        super(SearchObjectUpdateDateTuple.tupleName, {});
    }
}


// ----------------------------------------------------------------------------
/** SearchObject Cache
 *
 * This class has the following responsibilities:
 *
 * 1) Maintain a local storage of the index
 *
 * 2) Return DispKey searchs based on the index.
 *
 */
@Injectable()
export class PrivateSearchObjectLoaderService extends ComponentLifecycleEventEmitter {

    private index = new SearchObjectUpdateDateTuple();

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();
    private storage: TupleOfflineStorageService;

    constructor(private vortexService: VortexService,
                private vortexStatusService: VortexStatusService,
                storageFactory: TupleStorageFactoryService) {
        super();

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(searchObjectCacheStorageName)
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
            .then((tuples: SearchObjectUpdateDateTuple[]) => {
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
        this.vortexService.createEndpointObservable(this, clientSearchObjectWatchUpdateFromDeviceFilt)
            .takeUntil(this.onDestroyEvent)
            .subscribe((payloadEnvelope: PayloadEnvelope) => {
                this.processSearchObjectesFromServer(payloadEnvelope);
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

        let tuple = new SearchObjectUpdateDateTuple();
        tuple.updateDateByChunkKey = this.index.updateDateByChunkKey;

        let payload = new Payload(clientSearchObjectWatchUpdateFromDeviceFilt, [tuple]);
        this.vortexService.sendPayload(payload);
    }


    /** Process SearchObjectes From Server
     *
     * Process the grids the server has sent us.
     */
    private processSearchObjectesFromServer(payloadEnvelope: PayloadEnvelope) {
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
            .then((payload: Payload) => this.storeSearchObjectPayload(payload))
            .catch(e =>
                `SearchObjectCache.processSearchObjectesFromServer failed: ${e}`
            );

    }

    private storeSearchObjectPayload(payload: Payload) {

        let encodedSearchObjectChunkTuples: EncodedSearchObjectChunkTuple[] = <EncodedSearchObjectChunkTuple[]>payload.tuples;

        let tuplesToSave = [];

        for (let item of encodedSearchObjectChunkTuples) {
            tuplesToSave.push(item);
        }


        // 2) Store the index
        this.storeSearchObjectChunkTuples(tuplesToSave)
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
                `SearchObjectCache.storeSearchObjectPayload: ${e}`));

    }

    /** Store Index Bucket
     * Stores the index bucket in the local db.
     */
    private storeSearchObjectChunkTuples(encodedSearchObjectChunkTuples: EncodedSearchObjectChunkTuple[]): Promise<void> {
        let retPromise: any;
        retPromise = this.storage.transaction(true)
            .then((tx) => {

                let promises = [];

                for (let encodedSearchObjectChunkTuple of encodedSearchObjectChunkTuples) {
                    promises.push(
                        tx.saveTuplesEncoded(
                            new SearchObjectChunkTupleSelector(encodedSearchObjectChunkTuple.chunkKey),
                            encodedSearchObjectChunkTuple.encodedData
                        )
                    );
                }

                return Promise.all(promises)
                    .then(() => tx.close());
            });
        return retPromise;
    }


}