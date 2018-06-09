import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchPropertyTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchPropertyTuple";

    //  The name of the search property
    name: string;

    //  The title of the search property
    title: string;

    constructor() {
        super(SearchPropertyTuple.tupleName)
    }
}