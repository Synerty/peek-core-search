import { Component } from "@angular/core"
import { NgLifeCycleEvents, TupleSelector } from "@synerty/vortexjs"
import {
    PrivateSearchIndexLoaderService,
    PrivateSearchIndexLoaderStatusTuple
} from "@peek/peek_core_search/_private/search-index-loader"
import {
    PrivateSearchObjectLoaderService,
    PrivateSearchObjectLoaderStatusTuple
} from "@peek/peek_core_search/_private/search-object-loader"
import {
    OfflineConfigTuple,
    SearchTupleService
} from "@peek/peek_core_search/_private"

@Component({
    selector: "peek-core-search-cfg",
    templateUrl: "search-cfg.component.html"
})
export class SearchCfgComponent extends NgLifeCycleEvents {
    indexStatus: PrivateSearchIndexLoaderStatusTuple = new PrivateSearchIndexLoaderStatusTuple()
    objectStatus: PrivateSearchObjectLoaderStatusTuple = new PrivateSearchObjectLoaderStatusTuple()
    offlineConfig: OfflineConfigTuple = new OfflineConfigTuple()
    
    private offlineTs = new TupleSelector(OfflineConfigTuple.tupleName, {})
    
    constructor(
        private searchIndexLoader: PrivateSearchIndexLoaderService,
        private searchObjectLoader: PrivateSearchObjectLoaderService,
        private tupleService: SearchTupleService
    ) {
        super()
        
        this.indexStatus = this.searchIndexLoader.status()
        this.searchIndexLoader.statusObservable()
            .takeUntil(this.onDestroyEvent)
            .subscribe(value => this.indexStatus = value)
        
        this.objectStatus = this.searchObjectLoader.status()
        this.searchObjectLoader.statusObservable()
            .takeUntil(this.onDestroyEvent)
            .subscribe(value => this.objectStatus = value)
        
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(this.offlineTs, false, false, true)
            .takeUntil(this.onDestroyEvent)
            .subscribe((tuples: OfflineConfigTuple[]) => {
                if (tuples.length == 0) {
                    this.tupleService.offlineObserver.updateOfflineState(
                        this.offlineTs, [this.offlineConfig]
                    )
                    return
                }
            })
    }
    
    toggleOfflineMode(): void {
        this.offlineConfig.cacheChunksForOffline = !this.offlineConfig.cacheChunksForOffline
        this.tupleService.offlineObserver.updateOfflineState(
            this.offlineTs, [this.offlineConfig]
        )
    }
}
