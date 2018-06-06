import {Injectable} from "@angular/core";

import {Payload} from "@synerty/vortexjs";


import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import {
    EncodedSearchIndexChunkTuple,
    PrivateSearchIndexLoaderService
} from "./_private/search-index-loader";
import {
    EncodedSearchObjectChunkTuple,
    PrivateSearchObjectLoaderService
} from "./_private/search-object-loader";

import {SearchResultObjectTuple} from "./SearchResultObjectTuple";


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

    constructor(private searchIndexLoader: PrivateSearchIndexLoaderService,
                private searchObjectLoader: PrivateSearchObjectLoaderService) {


    }


    /** Get Locations
     *
     * Get the location of a Disp.key from the index..
     *
     */
    getObjects(keywords: string[]): Promise<SearchResultObjectTuple[]> {
        let x: EncodedSearchIndexChunkTuple;
        let y: EncodedSearchObjectChunkTuple;
        return Promise.reject("Not implemented");
        /*
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
*/
    }

}