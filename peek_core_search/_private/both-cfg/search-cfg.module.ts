import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { Routes } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzIconModule } from "ng-zorro-antd/icon";
import { RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { SearchCfgComponent } from "./search-cfg.component";


// Define the child routes for this plugin.
export const pluginRoutes: Routes = [
    // {
    //     path: 'showDiagram',
    //     component: SearchCfgComponent
    // },
    {
        path: "",
        pathMatch: "full",
        component: SearchCfgComponent,
    },
];

// Define the root module for this plugin.
// This module is loaded by the lazy loader, what ever this defines is what is started.
// When it first loads, it will look up the routes and then select the component to load.
@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(pluginRoutes),
        FormsModule,
        NzIconModule,
        HttpClientModule,
    ],
    exports: [],
    providers: [],
    declarations: [SearchCfgComponent],
})
export class SearchCfgModule {}
