import {Injectable} from "@angular/core";
import {LocationIndexTuple} from "../tuples/LocationIndexTuple";

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
    locationIndexCacheStorageName
} from "@peek/peek_plugin_diagram/_private";


import {LocationIndexUpdateDateTuple} from "../tuples/LocationIndexUpdateDateTuple";
import {DispKeyLocationTuple} from "../tuples/DispLocationTuple";
import {PrivateDiagramCoordSetService} from "./PrivateDiagramCoordSetService";

import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {EncodedLocationIndexTuple} from "../tuples/EncodedLocationIndexTuple";
import {PrivateSearchIndexLoaderService} from "./_private/services/PrivateSearchIndexLoaderService";

let pako = require("pako");


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
export class SearchService {

    private indexByModelSet = {};
    private storage: TupleOfflineStorageService;

    constructor(private searchIndexLoader: PrivateSearchIndexLoaderService,
                private searchObjectLoader: PrivateSearchObjectLoaderService,
                private vortexStatusService: VortexStatusService,
                storageFactory: TupleStorageFactoryService,
                private coordSetService: PrivateDiagramCoordSetService) {

        this.storage = new TupleOfflineStorageService(
            storageFactory,
            new TupleOfflineStorageNameService(locationIndexCacheStorageName)
        );

    }


    /** Get Locations
     *
     * Get the location of a Disp.key from the index..
     *
     */
    getLocations(dispKey: string): Promise<DispKeyLocationTuple[]> {
        if (dispKey == null || dispKey.length == 0) {
            let val: DispKeyLocationTuple[] = [];
            return Promise.resolve(val);
        }

        let indexBucket = dispKeyHashBucket(this.modelSetKey, dispKey);

        if (!this.index.indexBucketUpdateDates.hasOwnProperty(indexBucket)) {
            console.log(`DispKey ${dispKey} doesn't appear in the index`);
            return Promise.resolve([]);
        }

        let retPromise: any;
        retPromise = this.storage.loadTuples(new LocationIndexTupleSelector(indexBucket))
            .then((tuples: LocationIndexTuple[]) => {
                if (tuples.length == 0)
                    return [];

                if (tuples.length != 1)
                    throw new Error("We received more tuples then expected");

                let dispIndexArray = JSON.parse(tuples[0].jsonStr);

                let dispLocationIndexRawData: any[] | null = null;

                // TODO These keys are sorted, so we can do a binary search.
                for (let i = 0; i < dispIndexArray.length; i++) {
                    if (dispIndexArray[i][0] == dispKey) {
                        dispLocationIndexRawData = dispIndexArray[i].slice(1);
                        break;
                    }
                }

                // If we didn't find the key, return no indexes
                if (dispLocationIndexRawData == null)
                    return [];

                let dispIndexes: DispKeyLocationTuple[] = [];
                for (let rawData of dispLocationIndexRawData) {
                    let dispLocation = DispKeyLocationTuple.fromLocationJson(rawData);

                    let coordSet = this.coordSetService
                        .coordSetForId(dispLocation.coordSetId);

                    if (coordSet == null)
                        continue;

                    dispLocation.coordSetKey = coordSet.key;

                    dispIndexes.push(dispLocation);
                }

                return dispIndexes;
            });
        return retPromise;

    }

}