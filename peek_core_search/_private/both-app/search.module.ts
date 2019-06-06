import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {Routes} from "@angular/router";

// Import a small abstraction library to switch between nativescript and web
import {PeekModuleFactory} from "@synerty/peek-util-web";

// Import the default route component
import {SearchComponent} from "./search.component";

// Import the required classes from VortexJS
import {
    TupleOfflineStorageNameService,
    TupleOfflineStorageService
} from "@synerty/vortexjs";

// Import the names we need for the
import {
    searchTupleOfflineServiceName,
    searchObservableName,
    searchFilt
} from "@peek/peek_core_search/_private/PluginNames";

// Import the required classes from VortexJS
import {
    TupleDataObservableNameService,
    TupleDataObserverService,
    TupleDataOfflineObserverService
} from "@synerty/vortexjs";

// Import the names we need for the

import {FindComponent} from "./find-component/find.component";
import {ResultComponent} from "./result-component/result.component";


// Import the required classes from VortexJS
import {
    TupleActionPushNameService,
    TupleActionPushOfflineService,
    TupleActionPushService
} from "@synerty/vortexjs";

// Import the names we need for the
import {
    searchActionProcessorName
} from "@peek/peek_core_search/_private";




// Define the child routes for this plugin
export const pluginRoutes: Routes = [

    {
        path: '',
        pathMatch: 'full',
        component: SearchComponent
    }

];

// Define the root module for this plugin.
// This module is loaded by the lazy loader, what ever this defines is what is started.
// When it first loads, it will look up the routs and then select the component to load.
@NgModule({
    imports: [
        CommonModule,
        PeekModuleFactory.RouterModule,
        PeekModuleFactory.RouterModule.forChild(pluginRoutes),
        ...PeekModuleFactory.FormsModules,
    ],
    exports: [],
    providers: [
    ],
    declarations: [SearchComponent, FindComponent, ResultComponent]
})
export class SearchModule {
}
