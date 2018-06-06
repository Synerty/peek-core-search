import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "./_private/PluginNames";


@addTupleType
export class SearchResultObjectRouteTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchResultObjectRouteTuple";

    // The name of the open handler
    path: string;

    // The description of the open handlers action type
    title: string;

    constructor() {
        super(SearchResultObjectRouteTuple.tupleName)
    }
}