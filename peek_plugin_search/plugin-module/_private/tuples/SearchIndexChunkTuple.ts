import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchIndexChunkTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchIndexChunkTuple";

    //  The name of the detail
    name: string;

    //  The value of the detail
    value: string;

    constructor() {
        super(SearchIndexChunkTuple.tupleName)
    }
}
