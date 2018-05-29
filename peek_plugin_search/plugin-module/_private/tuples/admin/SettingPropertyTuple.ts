import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "../../PluginNames";


@addTupleType
export class SettingPropertyTuple extends Tuple {
    // The tuple name here should end in "Tuple" as well, but it doesn't, as it's a table
    public static readonly tupleName = searchTuplePrefix + "SettingProperty";

    id: number;
    settingId: number;
    key: string;
    type: string;

    int_value: number;
    char_value: string;
    boolean_value: boolean;


    constructor() {
        super(SettingPropertyTuple.tupleName)
    }
}