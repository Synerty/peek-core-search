import { addTupleType, Tuple } from "@synerty/vortexjs";
import { searchTuplePrefix } from "../PluginNames";

@addTupleType
export class ExcludeSearchStringsTuple extends Tuple {
    public static readonly tupleName =
        searchTuplePrefix + "ExcludeSearchStringsTuple";

    excludedSearchTerms: string[] = [];

    constructor() {
        super(ExcludeSearchStringsTuple.tupleName);
    }
}
