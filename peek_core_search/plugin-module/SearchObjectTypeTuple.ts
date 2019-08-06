import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "./_private/PluginNames";


@addTupleType
export class SearchObjectTypeTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchObjectTypeTuple";

    //  The id
    id: number;

    //  The name of the search object
    name: string;

    //  The title of the search object
    title: string;

    //  The order of the search object
    order: number;

    constructor() {
        super(SearchObjectTypeTuple.tupleName)
    }
}