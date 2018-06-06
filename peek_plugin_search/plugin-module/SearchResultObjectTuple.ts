import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "./_private/PluginNames";
import {SearchResultObjectRouteTuple} from "./SearchResultObjectRouteTuple";


@addTupleType
export class SearchResultObjectTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchResultObjectTuple";

    // The id of the object this search result is for
    objectId: string;

    // The type of this object in the search result
    objectType: string;

    // The details of the search result
    details: {} = {};

    // The details of the search result
    routes: SearchResultObjectRouteTuple[] = [];

    constructor() {
        super(SearchResultObjectTuple.tupleName)
    }
}