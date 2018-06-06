import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchObjectTypeTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchObjectTypeTuple";

    //  The name of the search property
    name: string;

    //  The title of the search property
    title: string;

    constructor() {
        super(SearchObjectTypeTuple.tupleName)
    }
}