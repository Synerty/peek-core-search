import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchIndexUpdateDateTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchIndexUpdateDateTuple";

    // Improve performance of the JSON serialisation
    protected _rawJonableFields = ['initialLoadComplete', 'updateDateByChunkKey'];

    initialLoadComplete: boolean = false;
    updateDateByChunkKey: {} = {};

    constructor() {
        super(SearchIndexUpdateDateTuple.tupleName)
    }
}