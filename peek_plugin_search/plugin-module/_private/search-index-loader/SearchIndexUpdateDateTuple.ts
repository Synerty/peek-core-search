import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchIndexUpdateDateTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchIndexUpdateDateTuple";

    initialLoadComplete: boolean = false;
    updateDateByChunkKey: {} = {};

    constructor() {
        super(SearchIndexUpdateDateTuple.tupleName)
    }
}