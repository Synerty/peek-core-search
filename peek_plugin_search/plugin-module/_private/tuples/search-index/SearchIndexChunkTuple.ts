import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../../PluginNames";


@addTupleType
export class SearchIndexChunkTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchIndexChunkTuple";

    // id: number;
    // encodedHash: string;

    chunkKey: string;
    encodedData: string;
    lastUpdate: string;

    constructor() {
        super(SearchIndexChunkTuple.tupleName)
    }
}
