import {addTupleType, Tuple} from "@synerty/vortexjs";
import {diagramTuplePrefix} from "@peek/peek_plugin_diagram/_private";


@addTupleType
export class SearchIndexUpdateDateTuple extends Tuple {
    public static readonly tupleName = diagramTuplePrefix + "SearchIndexUpdateDateTuple";

    initialLoadComplete: boolean = false;
    updateDateByChunkKey: {} = {};

    constructor() {
        super(SearchIndexUpdateDateTuple.tupleName)
    }
}