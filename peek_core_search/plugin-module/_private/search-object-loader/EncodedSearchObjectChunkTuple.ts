import { addTupleType, Tuple } from "@synerty/vortexjs";
import { searchTuplePrefix } from "../PluginNames";

@addTupleType
export class EncodedSearchObjectChunkTuple extends Tuple {
    public static readonly tupleName =
        searchTuplePrefix + "EncodedSearchObjectChunkTuple";

    chunkKey: string;
    lastUpdate: string;
    encodedData: string;

    constructor() {
        super(EncodedSearchObjectChunkTuple.tupleName);
    }
}
