import {Component, Input, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {
    searchBaseUrl,
    SearchObjectTypeTuple,
    SearchPropertyTuple
} from "@peek/peek_plugin_search/_private";

import {
    ComponentLifecycleEventEmitter,
    TupleActionPushService,
    TupleDataObserverService,
    TupleSelector
} from "@synerty/vortexjs";

import {
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_plugin_search";

interface PropT {
    title: string;
    value: string;
}

@Component({
    selector: 'plugin-search-result',
    templateUrl: 'result.component.web.html',
    moduleId: module.id
})
export class ResultComponent extends ComponentLifecycleEventEmitter implements OnInit {

    @Input("resultObject")
    resultObject: SearchResultObjectTuple = new SearchResultObjectTuple();

    @Input("propertiesByName")
    propertiesByName: { [key: string]: SearchPropertyTuple; } = {};

    @Input("objectTypeName")
    objectTypeName: string = '';

    properties: PropT[] = [];

    constructor(private router: Router) {
        super();


    }

    ngOnInit() {
        for (let name of Object.keys(this.resultObject.properties)) {
            this.properties.push({
                title: this.propertiesByName[name].title,
                value: this.resultObject.properties[name]
            });
        }
    }


    titleForProperty(propKey: string): string {
        return this.propertiesByName[propKey].title;
    }

    navTo(objectRoute: SearchResultObjectRouteTuple): void {
        let parts = objectRoute.path.split('?');
        let path = parts[0];

        if (parts.length == 1) {
            this.router.navigate([path]);
            return;
        }


        let params = {};
        objectRoute.path.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            (m, key, value) => params[key] = value
        );
        this.router.navigate([path, params]);

    }


}