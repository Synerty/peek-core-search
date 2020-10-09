import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {EditPropertyComponent} from "./edit-property-table/edit.component";
import {EditObjectTypeComponent} from "./edit-object-type-table/edit.component";
import {EditSettingComponent} from "./edit-setting-table/edit.component";
import {SearchComponent} from "./search.component";
import {StatusComponent} from "./status/status.component";
import {
    TupleActionPushNameService,
    TupleActionPushService,
    TupleDataObservableNameService,
    TupleDataObserverService,
    TupleDataOfflineObserverService,
    TupleOfflineStorageNameService,
    TupleOfflineStorageService
} from "@synerty/vortexjs";

import {
    searchActionProcessorName,
    searchFilt,
    searchObservableName,
    searchTupleOfflineServiceName
} from "@peek/peek_core_search/_private";
import { NzSwitchModule } from 'ng-zorro-antd/switch';


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
        FormsModule,
        NzSwitchModule
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
    declarations: [SearchComponent, EditPropertyComponent, EditSettingComponent, EditObjectTypeComponent, StatusComponent]
})
export class SearchModule {

}
