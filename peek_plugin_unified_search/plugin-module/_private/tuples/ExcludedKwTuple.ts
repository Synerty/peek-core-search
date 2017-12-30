import {addTupleType, Tuple} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";


@addTupleType
export class ExcludedKwTuple extends Tuple {
    public static readonly tupleName = unifiedSearchTuplePrefix + "ExcludedKwTuple";

    //  Description of date1
    id : number;

    //  Description of string1
    string1 : string;

    //  Description of int1
    int1 : number;

    constructor() {
        super(ExcludedKwTuple.tupleName)
    }
}