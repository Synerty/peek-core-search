import {addTupleType, Tuple} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";
import {SearchResultDetailTuple} from "./SearchResultDetailTuple";



@addTupleType
export class SearchResultTuple extends Tuple {
    public static readonly tupleName = unifiedSearchTuplePrefix + "SearchResultTuple";

    // The id of the object this search result is for
    objectId: string;

    // The type of this object in the search result
    objectType: string;

    // The details of the search result
    details: SearchResultDetailTuple[] = [];

    constructor() {
        super(SearchResultTuple.tupleName)
    }
}