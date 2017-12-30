import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {EditExcludedKwComponent} from "./edit-excluded-kw-table/edit.component";
import {EditSettingComponent} from "./edit-setting-table/edit.component";


// Import our components
import {UnifiedSearchComponent} from "./unifiedSearch.component";

// Define the routes for this Angular module
export const pluginRoutes: Routes = [
    {
        path: '',
        component: UnifiedSearchComponent
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
    providers: [],
    declarations: [UnifiedSearchComponent, EditExcludedKwComponent, EditSettingComponent]
})
export class UnifiedSearchModule {

}
