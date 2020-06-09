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
import {SearchResultObjectTuple} from "../../SearchResultObjectTuple";
import {SearchResultObjectRouteTuple} from "../../SearchResultObjectRouteTuple";
import {OfflineConfigTuple} from "../tuples/OfflineConfigTuple";
import {SearchTupleService} from "../SearchTupleService";
import {PrivateSearchObjectLoaderStatusTuple} from "./PrivateSearchObjectLoaderStatusTuple";
import {SearchObjectTypeTuple} from "../../SearchObjectTypeTuple";


// ----------------------------------------------------------------------------

let clientSearchObjectWatchUpdateFromDeviceFilt = extend(
    {"key": "clientSearchObjectWatchUpdateFromDevice"},
    searchFilt
);

const cacheAll = "cacheAll";

// ----------------------------------------------------------------------------
/** SearchObjectChunkTupleSelector
 *
 * This is just a short cut for the tuple selector
 */

class SearchObjectChunkTupleSelector extends TupleSelector {

    constructor(private chunkKey: number) {
        super(searchTuplePrefix + "SearchObjectChunkTuple", {key: chunkKey});
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
        super(SearchObjectUpdateDateTuple.tupleName, {});
    }
}


// ----------------------------------------------------------------------------
/** hash method
 */
let OBJECT_BUCKET_COUNT = 8192;

function objectIdChunk(objectId: number): number {
    /** Object ID Chunk

     This method creates an int from 0 to MAX, representing the hash bucket for this
     object Id.

     This is simple, and provides a reasonable distribution

     @param objectId: The ID if the object to get the chunk key for

     @return: The bucket / chunkKey where you'll find the object with this ID

     */
    if (objectId == null)
        throw new Error("objectId None or zero length");

    return objectId & (OBJECT_BUCKET_COUNT - 1);
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
    private UPDATE_CHUNK_FETCH_SIZE = 5;
    private OFFLINE_CHECK_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

    private index = new SearchObjectUpdateDateTuple();
    private askServerChunks: SearchObjectUpdateDateTuple[] = [];

    private _hasLoaded = false;

    private _hasLoadedSubject = new Subject<void>();
    private storage: TupleOfflineStorageService;

    private _statusSubject = new Subject<PrivateSearchObjectLoaderStatusTuple>();
    private _status = new PrivateSearchObjectLoaderStatusTuple();

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
            new TupleOfflineStorageNameService(searchObjectCacheStorageName)
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

    statusObservable(): Observable<PrivateSearchObjectLoaderStatusTuple> {
        return this._statusSubject;
    }

    status(): PrivateSearchObjectLoaderStatusTuple {
        return this._status;
    }

    /** Get Objects
     *
     * Get the objects with matching keywords from the index..
     *
     */
    getObjects(objectTypeId: number | null, objectIds: number[]): Promise<SearchResultObjectTuple[]> {
        if (objectIds == null || objectIds.length == 0) {
            throw new Error("We've been passed a null/empty objectIds");
        }

        if (this.isReady())
            return this.getObjectsWhenReady(objectTypeId, objectIds);

        return this.isReadyObservable()
            .first()
            .toPromise()
            .then(() => this.getObjectsWhenReady(objectTypeId, objectIds));
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
                let tuples: SearchObjectUpdateDateTuple[] = tuplesAny;
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
        this.vortexService.createEndpointObservable(this, clientSearchObjectWatchUpdateFromDeviceFilt)
            .takeUntil(this.onDestroyEvent)
            .subscribe((payloadEnvelope: PayloadEnvelope) => {
                this.processSearchObjectsFromServer(payloadEnvelope);
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
                let serverIndex: SearchObjectUpdateDateTuple = tuplesAny[0];
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
        let indexChunk = new SearchObjectUpdateDateTuple();

        for (let key of keysNeedingUpdate) {
            indexChunk.updateDateByChunkKey[key] = this.index.updateDateByChunkKey[key];
            count++;

            if (count == this.UPDATE_CHUNK_FETCH_SIZE) {
                this.askServerChunks.push(indexChunk);
                count = 0;
                indexChunk = new SearchObjectUpdateDateTuple();
            }
        }

        if (count)
            this.askServerChunks.push(indexChunk);

        this.askServerForNextUpdateChunk();

        this._status.lastCheck = new Date();

    }

    private askServerForNextUpdateChunk() {
        if (!this.areWeTalkingToTheServer()) return;

        if (this.askServerChunks.length == 0)
            return;

        let indexChunk: SearchObjectUpdateDateTuple = this.askServerChunks.pop();
        let filt = extend({}, clientSearchObjectWatchUpdateFromDeviceFilt);
        filt[cacheAll] = true;
        let pl = new Payload(filt, [indexChunk]);
        this.vortexService.sendPayload(pl);

        this._status.lastCheck = new Date();
        this._notifyStatus();
    }

    /** Process SearchObjects From Server
     *
     * Process the grids the server has sent us.
     */
    private processSearchObjectsFromServer(payloadEnvelope: PayloadEnvelope) {

        if (payloadEnvelope.result != null && payloadEnvelope.result != true) {
            console.log(`ERROR: ${payloadEnvelope.result}`);
            return;
        }

        payloadEnvelope
            .decodePayload()
            .then((payload: Payload) => this.storeSearchObjectPayload(payload))
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
                `SearchObjectCache.processSearchObjectsFromServer failed: ${e}`
            );

    }

    private storeSearchObjectPayload(payload: Payload) {

        let tuplesToSave: EncodedSearchObjectChunkTuple[] = <EncodedSearchObjectChunkTuple[]>payload.tuples;
        if (tuplesToSave.length == 0)
            return;

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

    /** Get Objects When Ready
     *
     * Get the objects with matching keywords from the index..
     *
     */
    private getObjectsWhenReady(objectTypeId: number | null, objectIds: number[]): Promise<SearchResultObjectTuple[]> {

        let objectIdsByChunkKey: { [key: number]: number[]; } = {};
        let chunkKeys: number[] = [];

        for (let objectId of objectIds) {
            let chunkKey: number = objectIdChunk(objectId);
            if (objectIdsByChunkKey[chunkKey] == null)
                objectIdsByChunkKey[chunkKey] = [];
            objectIdsByChunkKey[chunkKey].push(objectId);
            chunkKeys.push(chunkKey);
        }


        let promises = [];
        for (let chunkKey of chunkKeys) {
            let objectIds = objectIdsByChunkKey[chunkKey];
            promises.push(
                this.getObjectsForObjectIds(objectTypeId, objectIds, chunkKey)
            );
        }

        return Promise.all(promises)
            .then((results: SearchResultObjectTuple[][]) => {
                let objects: SearchResultObjectTuple[] = [];
                for (let result of results) {
                    objects.add(result);
                }
                return objects;
            });
    }


    /** Get Objects for Object ID
     *
     * Get the objects with matching keywords from the index..
     *
     */
    private getObjectsForObjectIds(objectTypeId: number | null,
                                   objectIds: number[],
                                   chunkKey: number): Promise<SearchResultObjectTuple[]> {

        if (!this.index.updateDateByChunkKey.hasOwnProperty(chunkKey)) {
            console.log(`ObjectIDs: ${objectIds} doesn't appear in the index`);
            return Promise.resolve([]);
        }

        let retPromise: any;
        retPromise = this.storage.loadTuplesEncoded(new SearchObjectChunkTupleSelector(chunkKey))
            .then((vortexMsg: string) => {
                if (vortexMsg == null) {
                    return [];
                }


                return Payload.fromEncodedPayload(vortexMsg)
                    .then((payload: Payload) => JSON.parse(<any>payload.tuples))
                    .then((chunkData: { [key: number]: string; }) => {

                        let foundObjects: SearchResultObjectTuple[] = [];

                        for (let objectId of objectIds) {
                            // Find the keyword, we're just iterating
                            if (!chunkData.hasOwnProperty(objectId)) {
                                console.log(
                                    `WARNING: ObjectID ${objectId} is missing from index,`
                                    + ` chunkKey ${chunkKey}`
                                );
                                continue;
                            }

                            // Reconstruct the data
                            let objectProps: {} = JSON.parse(chunkData[objectId]);

                            // Get out the object type
                            let thisObjectTypeId = objectProps["_otid_"];
                            delete objectProps["_otid_"];

                            // If the property is set, then make sure it matches
                            if (objectTypeId != null && objectTypeId != thisObjectTypeId)
                                continue;

                            // Get out the routes
                            let routes: string[][] = objectProps["_r_"];
                            delete objectProps["_r_"];

                            // Get the key
                            let objectKey: string = objectProps["key"];

                            // Create the new object
                            let newObject = new SearchResultObjectTuple();
                            foundObjects.push(newObject);

                            newObject.id = objectId;
                            newObject.key = objectKey;
                            newObject.objectType = new SearchObjectTypeTuple();
                            newObject.objectType.id = thisObjectTypeId;
                            newObject.properties = objectProps;

                            for (let route of routes) {
                                let newRoute = new SearchResultObjectRouteTuple();
                                newObject.routes.push(newRoute);

                                newRoute.title = route[0];
                                newRoute.path = route[1];
                            }
                        }

                        return foundObjects;

                    });
            });

        return retPromise;

    }


}
