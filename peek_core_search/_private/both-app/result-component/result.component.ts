import { ChangeDetectorRef, Component, Input, ChangeDetectionStrategy } from "@angular/core"
import { Router } from "@angular/router"
import { NgLifeCycleEvents } from "@synerty/peek-plugin-base-js"
import {
    SearchObjectTypeTuple,
    SearchPropT,
    SearchResultObjectRouteTuple,
    SearchResultObjectTuple,
    SearchService
} from "@peek/peek_core_search"
import { searchPluginName } from "@peek/peek_core_search/_private"
import { DocDbPopupService, DocDbPopupTypeE } from "@peek/peek_core_docdb"
import { BehaviorSubject } from "rxjs"

interface IItemResult {
    key: string;
    modelSetKey: string;
    header: string,
    bodyProps: SearchPropT[]
}

interface IObjectTypeResults {
    type: SearchObjectTypeTuple,
    results: IItemResult[]
}

@Component({
    selector: "plugin-search-result",
    templateUrl: "result.component.html",
    styleUrls: ["result.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultComponent extends NgLifeCycleEvents {
    @Input("firstSearchHasRun")
    firstSearchHasRun: boolean
    
    @Input("resultObjects")
    set resultObjects(resultObjects: SearchResultObjectTuple[]) {
        if (!resultObjects) {
            return
        }
        
        const resultsGroupByType: { [id: number]: IObjectTypeResults } = {}
        let resultObjectTypes = []
        
        for (const object of resultObjects) {
            let typeResult = resultsGroupByType[object.objectType.id]
            
            if (typeResult == null) {
                typeResult = resultsGroupByType[object.objectType.id] = {
                    type: object.objectType,
                    results: []
                }
                resultObjectTypes.push(typeResult)
            }
            
            const props = this.searchService
                .getNiceOrderedProperties(object)
                .filter(p => p.showOnResult)
            
            typeResult.results.push({
                key: object.key,
                modelSetKey: "pofDiagram",
                header: this.headerProps(props),
                bodyProps: this.bodyProps(props)
            })
        }
        
        this.resultObjectTypes$.next(resultObjectTypes.sort((
            a,
            b
        ) => {
            if (a.type.order < b.type.order) return -1
            if (a.type.order > b.type.order) return 1
            if (a.type.title < b.type.title) return -1
            if (a.type.title > b.type.title) return 1
            return 0
        }))
    }
    
    resultObjectTypes$ = new BehaviorSubject<IObjectTypeResults[]>([])
    
    constructor(
        private objectPopupService: DocDbPopupService,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private searchService: SearchService,
    ) {
        super()
    }
    
    headerProps(props: SearchPropT[]): string {
        return props.filter(p => p.showInHeader)
            .map(p => p.value)
            .join()
    }
    
    bodyProps(props: SearchPropT[]): SearchPropT[] {
        return props.filter(p => !p.showInHeader)
    }
    
    showTooltipPopup(
        event: MouseEvent,
        result: IItemResult
    ) {
        this.objectPopupService
            .showPopup(
                DocDbPopupTypeE.tooltipPopup,
                searchPluginName,
                {
                    x: event.x,
                    y: event.y
                },
                result.modelSetKey,
                result.key
            )
    }
    
    hideTooltipPopup(
        $event: MouseEvent,
        result: IItemResult
    ) {
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup)
    }
    
    showSummaryPopup(
        $event: MouseEvent,
        result: IItemResult
    ) {
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup)
        this.objectPopupService
            .showPopup(
                DocDbPopupTypeE.summaryPopup,
                searchPluginName,
                $event,
                result.modelSetKey,
                result.key
            )
    }
    
    navTo(objectRoute: SearchResultObjectRouteTuple): void {
        objectRoute.navTo(this.router)
    }
}
