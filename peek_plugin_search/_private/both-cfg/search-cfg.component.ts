import {Component, Input} from "@angular/core";
import {
    PrivateDiagramCacheStatusService
} from "@peek/peek_plugin_diagram/_private/services/PrivateDiagramCacheStatusService";

import {ComponentLifecycleEventEmitter} from "@synerty/vortexjs";
import {GridLoaderA} from "peek_plugin_diagram/cache/GridLoader";


@Component({
    selector: 'peek-plugin-diagram-cfg',
    templateUrl: 'search-cfg.component.web.html',
    moduleId: module.id
})
export class SearchCfgComponent extends ComponentLifecycleEventEmitter {

    lastStatus: string = "Not Running";


    constructor(private gridLoader: GridLoaderA,
                private gridCachingStatus: PrivateDiagramCacheStatusService) {
        super();

        this.gridCachingStatus.cacheProgressObservable
            .takeUntil(this.onDestroyEvent)
            .subscribe( value => this.lastStatus = value);

    }

    cacheAllClicked(): void {
        this.gridLoader.cacheAll();
        alert("CACHING has started");
    }

}
