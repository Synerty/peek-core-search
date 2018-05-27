import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class EncodedSearchIndexChunkTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "EncodedSearchIndexChunkTuple";

    chunkKey: string;
    lastUpdate: string;
    encodedPayload: string;

    constructor() {
        super(EncodedSearchIndexChunkTuple.tupleName)
    }
}
