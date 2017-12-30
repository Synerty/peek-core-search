 import {addTupleType, Tuple, TupleActionABC} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";

@addTupleType
export class AddIntValueActionTuple extends TupleActionABC {
    static readonly tupleName = unifiedSearchTuplePrefix + "AddIntValueActionTuple";

    excludedKwId: number;
    offset: number;

    constructor() {
        super(AddIntValueActionTuple.tupleName)
    }
}