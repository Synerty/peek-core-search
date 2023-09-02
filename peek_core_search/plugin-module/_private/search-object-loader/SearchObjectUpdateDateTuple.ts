import { addTupleType, Tuple } from "@synerty/vortexjs";
import { searchTuplePrefix } from "../PluginNames";

@addTupleType
export class SearchObjectUpdateDateTuple extends Tuple {
    public static readonly tupleName =
        searchTuplePrefix + "SearchObjectUpdateDateTuple";
    initialLoadComplete: boolean = false;
    updateDateByChunkKey: {} = {};
    // Improve performance of the JSON serialisation
    protected override _rawJonableFields = [
        "initialLoadComplete",
        "updateDateByChunkKey",
    ];

    constructor() {
        super(SearchObjectUpdateDateTuple.tupleName);
    }
}
