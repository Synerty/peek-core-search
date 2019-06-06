import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "./_private/PluginNames";
import {SearchResultObjectRouteTuple} from "./SearchResultObjectRouteTuple";
import {SearchObjectTypeTuple} from "./SearchObjectTypeTuple";


@addTupleType
export class SearchResultObjectTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchResultObjectTuple";

    // The id of the object this search result is for
    id: number;

    // The key of the object
    key: string;

    // The type of this object in the search result
    objectType: SearchObjectTypeTuple = new SearchObjectTypeTuple();

    // The details of the search result
    properties: { [key: string]: string; } = {};

    // The details of the search result
    routes: SearchResultObjectRouteTuple[] = [];

    constructor() {
        super(SearchResultObjectTuple.tupleName)
    }
}