                                       import {addTupleType, Tuple, TupleActionABC} from "@synerty/vortexjs";
import {unifiedSearchTuplePrefix} from "../PluginNames";

@addTupleType
export class StringCapToggleActionTuple extends TupleActionABC {
    static readonly tupleName = unifiedSearchTuplePrefix + "StringCapToggleActionTuple";

    excludedKwId: number;

    constructor() {
        super(StringCapToggleActionTuple.tupleName)
    }
}