import {Router} from "@angular/router";
import {addTupleType, Tuple} from "@synerty/vortexjs";
import {searchTuplePrefix} from "./_private/PluginNames";


@addTupleType
export class SearchResultObjectRouteTuple extends Tuple {
    public static readonly tupleName = searchTuplePrefix + "SearchResultObjectRouteTuple";

    // The name of the open handler
    path: string;

    // The description of the open handlers action type
    title: string;

    constructor() {
        super(SearchResultObjectRouteTuple.tupleName)
    }

    navTo(router: Router): void {
        let origPath = this.path;
        let parts = origPath.split('?');
        let path = parts[0];

        if (parts.length == 1) {
            router.navigate([path]);
            return;
        }

        let params = {};
        origPath.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            (m, key, value) => params[key] = value
        );
        router.navigate([path, params]);
    }
}