import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class EncodedSearchIndexChunkTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "EncodedSearchIndexChunkTuple";

    chunkKey: number;
    lastUpdate: string;
    encodedData: string;

    constructor() {
        super(EncodedSearchIndexChunkTuple.tupleName)
    }
}
