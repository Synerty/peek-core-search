import {addTupleType, Tuple} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchResultOpenHandlerTuple extends Tuple {
    public static readonly tupleName = unifiedSearchTuplePrefix + "SearchResultOpenHandlerTuple";

    // The key of a registered open handler
    key: string;

    // The name of the open handler
    name: string;

    // The description of the open handlers action type
    title: string;

    constructor() {
        super(SearchResultOpenHandlerTuple.tupleName)
    }
}