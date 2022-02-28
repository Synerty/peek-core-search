import { BehaviorSubject } from "rxjs";
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
} from "@angular/core";
import { Router } from "@angular/router";
import { NgLifeCycleEvents } from "@synerty/vortexjs";
import {
    SearchObjectTypeTuple,
    SearchPropT,
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService,
} from "@peek/peek_core_search";
import { searchPluginName } from "@peek/peek_core_search/_private";
import { DocDbPopupService, DocDbPopupTypeE } from "@peek/peek_core_docdb";

interface IItemResult {
    key: string;
    modelSetKey: string;
    header: string;
    bodyProps: SearchPropT[];
    rank: number;
}

interface IObjectTypeResults {
    type: SearchObjectTypeTuple;
    results: IItemResult[];
}

@Component({
    selector: "result-component",
    templateUrl: "result.component.html",
    styleUrls: ["result.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultComponent extends NgLifeCycleEvents {
    @Input("firstSearchHasRun")
    firstSearchHasRun: boolean;
    resultObjectTypes$ = new BehaviorSubject<IObjectTypeResults[]>([]);

    constructor(
        private objectPopupService: DocDbPopupService,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private searchService: SearchService
    ) {
        super();
    }

    @Input("resultObjects")
    set resultObjects(resultObjects: SearchResultObjectTuple[]) {
        if (!resultObjects) {
            return;
        }

        resultObjects.sort((a, b) => a.rank - b.rank);

        const resultsGroupByType: { [id: number]: IObjectTypeResults } = {};
        let resultObjectTypes = [];

        for (const object of resultObjects) {
            let typeResult = resultsGroupByType[object.objectType.id];

            if (typeResult == null) {
                typeResult = resultsGroupByType[object.objectType.id] = {
                    type: object.objectType,
                    results: [],
                };
                resultObjectTypes.push(typeResult);
            }

            const props = this.searchService
                .getNiceOrderedProperties(object)
                .filter((p) => p.showOnResult);

            typeResult.results.push({
                key: object.key,
                rank: object.rank,
                modelSetKey: "pofDiagram",
                header: this.headerProps(props),
                bodyProps: this.bodyProps(props),
            });
        }

        this.resultObjectTypes$.next(resultObjectTypes);
    }

    headerProps(props: SearchPropT[]): string {
        return props
            .filter((p) => p.showInHeader)
            .map((p) => p.value)
            .join();
    }

    bodyProps(props: SearchPropT[]): SearchPropT[] {
        return props.filter((p) => !p.showInHeader);
    }

    showSummaryPopup($event: MouseEvent, result: IItemResult) {
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup);
        this.objectPopupService.showPopup(
            true,
            DocDbPopupTypeE.summaryPopup,
            searchPluginName,
            $event,
            result.modelSetKey,
            result.key
        );
    }

    navTo(objectRoute: SearchResultObjectRouteTuple): void {
        objectRoute.navTo(this.router);
    }
}
