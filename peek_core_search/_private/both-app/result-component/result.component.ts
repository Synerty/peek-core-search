import {ChangeDetectorRef, Component, Input, OnInit} from "@angular/core";
import {Router} from "@angular/router";

import {ComponentLifecycleEventEmitter} from "@synerty/vortexjs";
import * as $ from "jquery";

import {
    SearchObjectTypeTuple,
    SearchPropT,
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_core_search";
import {searchPluginName} from "@peek/peek_core_search/_private";

import {DocDbPopupService, DocDbPopupTypeE} from "@peek/peek_plugin_docdb";

interface ItemResultI {
    key: string;
    modelSetKey: string;
    header: string,
    bodyProps: SearchPropT[]
}

interface ObjectTypeResultsI {
    type: SearchObjectTypeTuple,
    results: ItemResultI[]
}

@Component({
    selector: 'plugin-search-result',
    templateUrl: 'result.component.web.html',
    styleUrls: ["result.component.web.scss"],
    moduleId: module.id,
})
export class ResultComponent extends ComponentLifecycleEventEmitter implements OnInit {

    resultObjectTypes: ObjectTypeResultsI[] = [];


    constructor(private objectPopupService: DocDbPopupService,
                private cdr: ChangeDetectorRef,
                private router: Router,
                private searchService: SearchService) {
        super();

    }

    ngOnInit() {
    }


    @Input("resultObjects")
    set resultObjects(resultObjects: SearchResultObjectTuple[]) {
        const resultsGroupByType: { [id: number]: ObjectTypeResultsI } = {};
        this.resultObjectTypes = [];
        for (const object of resultObjects) {
            let typeResult = resultsGroupByType[object.objectType.id];

            if (typeResult == null) {
                typeResult = resultsGroupByType[object.objectType.id] = {
                    type: object.objectType,
                    results: []
                };
                this.resultObjectTypes.push(typeResult);
            }

            const props = this.searchService
                .getNiceOrderedProperties(object)
                .filter(p => p.showOnResult);

            typeResult.results.push({
                key: object.key,
                modelSetKey: 'pofDiagram',
                header: this.headerProps(props),
                bodyProps: this.bodyProps(props)
            });
        }

        this.resultObjectTypes.sort((a, b) => {
            if (a.type.order < b.type.order) return -1;
            if (a.type.order > b.type.order) return 1;
            if (a.type.title < b.type.title) return -1;
            if (a.type.title > b.type.title) return 1;
            return 0;
        });

    }


    headerProps(props: SearchPropT[]): string {
        return props.filter(p => p.showInHeader)
            .map(p => p.value)
            .join();
    }

    bodyProps(props: SearchPropT[]): SearchPropT[] {
        return props.filter(p => !p.showInHeader);
    }

    tooltipEnter($event: MouseEvent, result: ItemResultI) {
        const offset = $(".scroll-container").offset();
        this.objectPopupService
            .showPopup(
                DocDbPopupTypeE.tooltipPopup,
                searchPluginName,
                {
                    x: $event.x + 50,
                    y: $event.y
                },
                result.modelSetKey,
                result.key);

    }

    tooltipExit($event: MouseEvent, result: ItemResultI) {
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup);

    }

    showSummaryPopup($event: MouseEvent, result: ItemResultI) {
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup);
        this.objectPopupService
            .showPopup(
                DocDbPopupTypeE.summaryPopup,
                searchPluginName,
                $event,
                result.modelSetKey,
                result.key);

    }


    navTo(objectRoute: SearchResultObjectRouteTuple): void {
        objectRoute.navTo(this.router);

    }


}