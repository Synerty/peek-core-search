import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {EditPropertyComponent} from "./edit-property-table/edit.component";
import {EditSettingComponent} from "./edit-setting-table/edit.component";
import {SearchComponent} from "./search.component";
import {StatusComponent} from "./status/status.component";
import {
    TupleActionPushNameService,
    TupleActionPushService,
    TupleDataObservableNameService,
    TupleDataObserverService,
    TupleOfflineStorageNameService,
    TupleOfflineStorageService,
    TupleDataOfflineObserverService
} from "@synerty/vortexjs";

import {
    searchActionProcessorName,
    searchFilt,
    searchObservableName,
    searchTupleOfflineServiceName
} from "@peek/peek_plugin_search/_private";


export function tupleActionPushNameServiceFactory() {
    return new TupleActionPushNameService(
        searchActionProcessorName, searchFilt);
}

export function tupleDataObservableNameServiceFactory() {
    return new TupleDataObservableNameService(
        searchObservableName, searchFilt);
}

export function tupleOfflineStorageNameServiceFactory() {
    return new TupleOfflineStorageNameService(searchTupleOfflineServiceName);
}

// Define the routes for this Angular module
export const pluginRoutes: Routes = [
    {
        path: '',
        component: SearchComponent
    }

];

// Define the module
@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(pluginRoutes),
        FormsModule
    ],
    exports: [],
    providers: [
        TupleActionPushService, {
            provide: TupleActionPushNameService,
            useFactory: tupleActionPushNameServiceFactory
        },
        TupleOfflineStorageService, {
            provide: TupleOfflineStorageNameService,
            useFactory: tupleOfflineStorageNameServiceFactory
        },
        TupleDataObserverService, TupleDataOfflineObserverService, {
            provide: TupleDataObservableNameService,
            useFactory: tupleDataObservableNameServiceFactory
        },
    ],
    declarations: [SearchComponent, EditPropertyComponent, EditSettingComponent, StatusComponent]
})
export class SearchModule {

}
