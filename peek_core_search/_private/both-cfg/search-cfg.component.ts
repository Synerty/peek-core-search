import { takeUntil } from "rxjs/operators";
import { Component } from "@angular/core";
import { NgLifeCycleEvents } from "@synerty/vortexjs";
import {
    PrivateSearchIndexLoaderService,
    PrivateSearchIndexLoaderStatusTuple,
} from "@peek/peek_core_search/_private/search-index-loader";
import {
    PrivateSearchObjectLoaderService,
    PrivateSearchObjectLoaderStatusTuple,
} from "@peek/peek_core_search/_private/search-object-loader";
import { SearchTupleService } from "@peek/peek_core_search/_private";

@Component({
    selector: "peek-core-search-cfg",
    templateUrl: "search-cfg.component.html",
})
export class SearchCfgComponent extends NgLifeCycleEvents {
    indexStatus: PrivateSearchIndexLoaderStatusTuple =
        new PrivateSearchIndexLoaderStatusTuple();
    objectStatus: PrivateSearchObjectLoaderStatusTuple =
        new PrivateSearchObjectLoaderStatusTuple();

    constructor(
        private searchIndexLoader: PrivateSearchIndexLoaderService,
        private searchObjectLoader: PrivateSearchObjectLoaderService,
        private tupleService: SearchTupleService
    ) {
        super();

        this.indexStatus = this.searchIndexLoader.status();
        this.searchIndexLoader
            .statusObservable()
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((value) => (this.indexStatus = value));

        this.objectStatus = this.searchObjectLoader.status();
        this.searchObjectLoader
            .statusObservable()
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((value) => (this.objectStatus = value));
    }
}
