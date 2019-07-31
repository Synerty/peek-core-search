import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class SearchPropertyTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchPropertyTuple";

    //  The id
    id: number;

    //  The name of the search property
    name: string;

    //  The title of the search property
    title: string;

    //  The order of the search property
    order: number;

    // Should this property be shown as the name in the search result
    showInHeader:boolean;

    // Should this property be shown on the search result at all.
    showOnResult:boolean;

    constructor() {
        super(SearchPropertyTuple.tupleName)
    }
}