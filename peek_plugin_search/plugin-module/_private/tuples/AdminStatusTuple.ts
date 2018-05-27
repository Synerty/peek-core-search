import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../PluginNames";


@addTupleType
export class AdminStatusTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "AdminStatusTuple";

    displayCompilerQueueStatus: boolean;
    displayCompilerQueueSize: number;
    displayCompilerProcessedTotal: number;
    displayCompilerLastError: string;

    gridCompilerQueueStatus: boolean;
    gridCompilerQueueSize: number;
    gridCompilerQueueProcessedTotal: number;
    gridCompilerQueueLastError: string;

    locationIndexCompilerQueueStatus: boolean;
    locationIndexCompilerQueueSize: number;
    locationIndexCompilerQueueProcessedTotal: number;
    locationIndexCompilerQueueLastError: string;

    constructor() {
        super(AdminStatusTuple.tupleName)
    }
}