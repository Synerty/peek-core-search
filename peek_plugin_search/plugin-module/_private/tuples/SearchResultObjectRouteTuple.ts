import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchResultObjectRouteTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchResultObjectRouteTuple";

    // The key of a registered open handler
    key: string;

    // The name of the open handler
    name: string;

    // The description of the open handlers action type
    title: string;

    constructor() {
        super(SearchResultObjectRouteTuple.tupleName)
    }
}