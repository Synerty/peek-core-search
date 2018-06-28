import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {Routes} from "@angular/router";
// Import a small abstraction library to switch between nativescript and web
import {PeekModuleFactory} from "@synerty/peek-util-web";
// Import the default route component
import {SearchCfgComponent} from "./search-cfg.component";
// Import global modules, for example, the canvas extensions.



// Define the child routes for this plugin
export const pluginRoutes: Routes = [
    // {
    //     path: 'showDiagram',
    //     component: SearchCfgComponent
    // },
    {
        path: '',
        pathMatch: 'full',
        component: SearchCfgComponent
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
    providers: [],
    declarations: [SearchCfgComponent]
})
export class SearchCfgModule {
}
