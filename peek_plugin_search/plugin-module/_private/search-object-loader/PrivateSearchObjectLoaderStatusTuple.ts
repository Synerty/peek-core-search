import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class PrivateSearchObjectLoaderStatusTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "PrivateSearchObjectLoaderStatusTuple";


    cacheForOfflineEnabled: boolean = false;
    initialLoadComplete: boolean = false;
    loadProgress: number = 0;
    loadTotal: number = 0;
    lastCheck: Date;

    constructor() {
        super(PrivateSearchObjectLoaderStatusTuple.tupleName)
    }
}
