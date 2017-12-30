import {addTupleType, Tuple} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchResultDetailTuple extends Tuple {
    public static readonly tupleName = unifiedSearchTuplePrefix + "SearchResultTuple";

    //  The name of the detail
    name: string;

    //  The value of the detail
    value: string;

    constructor() {
        super(SearchResultDetailTuple.tupleName)
    }
}
