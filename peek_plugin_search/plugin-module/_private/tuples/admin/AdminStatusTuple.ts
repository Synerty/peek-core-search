import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../../PluginNames";


@addTupleType
export class AdminStatusTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "AdminStatusTuple";

    searchIndexCompilerQueueStatus: boolean;
    searchIndexCompilerQueueSize: number;
    searchIndexCompilerQueueProcessedTotal: number;
    searchIndexCompilerQueueLastError: string;

    objectIndexCompilerQueueStatus: boolean;
    objectIndexCompilerQueueSize: number;
    objectIndexCompilerQueueProcessedTotal: number;
    objectIndexCompilerQueueLastError: string;

    constructor() {
        super(AdminStatusTuple.tupleName)
    }
}