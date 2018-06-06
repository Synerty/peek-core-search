import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchObjectUpdateDateTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchObjectUpdateDateTuple";

    initialLoadComplete: boolean = false;
    updateDateByChunkKey: {} = {};

    constructor() {
        super(SearchObjectUpdateDateTuple.tupleName)
    }
}