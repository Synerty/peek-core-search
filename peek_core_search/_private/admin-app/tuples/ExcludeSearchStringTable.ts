import { addTupleType, Tuple } from "@synerty/vortexjs";
import { searchTuplePrefix } from "@peek/peek_core_search/_private";

@addTupleType
export class ExcludeSearchStringTable extends Tuple {
    public static readonly tupleName =
        searchTuplePrefix + "ExcludeSearchStringTable";

    id: number;
    term: string;
    partial: boolean;
    full: boolean;
    comment: string;

    constructor() {
        super(ExcludeSearchStringTable.tupleName);
    }
}
