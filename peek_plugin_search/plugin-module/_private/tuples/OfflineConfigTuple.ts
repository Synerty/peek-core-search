import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class OfflineConfigTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "OfflineConfigTuple";

    cacheChunksForOffline: boolean = false;

    constructor() {
        super(OfflineConfigTuple.tupleName)
    }
}