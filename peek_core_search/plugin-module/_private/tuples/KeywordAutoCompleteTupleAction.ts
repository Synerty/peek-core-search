import {addTupleType, TupleActionABC} from "@synerty/vortexjs";
import {searchTuplePrefix} from "@peek/peek_core_search/_private/PluginNames";


@addTupleType
export class KeywordAutoCompleteTupleAction extends TupleActionABC {
    public static readonly tupleName = searchTuplePrefix + "KeywordAutoCompleteTupleAction";

    // The object it to filter for
    objectTypeId: number | null = null;

    //  The property key to restrict to
    propertyName: string | null = null;

    //  The partial keywords to search for
    searchString: string = null;

    constructor() {
        super(KeywordAutoCompleteTupleAction.tupleName)
    }
}
