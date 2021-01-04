import {
    Component,
    EventEmitter,
    Input,
    Output,
    ChangeDetectionStrategy
} from "@angular/core"
import {
    DocDbPopupClosedReasonE,
    DocDbPopupService,
    DocDbPopupTypeE
} from "@peek/peek_core_docdb"

// This is a root/global component
@Component({
    selector: "plugin-search",
    templateUrl: "search.component.html",
    styleUrls: ["search.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
    @Output("showSearchChange") showSearchChange = new EventEmitter()
    
    constructor(private objectPopupService: DocDbPopupService) {
        this.objectPopupService
            .popupClosedObservable(DocDbPopupTypeE.summaryPopup)
            .filter(reason => reason == DocDbPopupClosedReasonE.userClickedAction)
            .subscribe(() => this.showSearch = false)
        
        this.objectPopupService
            .popupClosedObservable(DocDbPopupTypeE.detailPopup)
            .filter(reason => reason == DocDbPopupClosedReasonE.userClickedAction)
            .subscribe(() => this.showSearch = false)
    }
    
    private _showSearch = false
    
    @Input("showSearch")
    get showSearch() {
        return this._showSearch
    }
    
    set showSearch(val) {
        // Hide the tooltip when the search panel is closed
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup)
        this._showSearch = val
        this.showSearchChange.emit(val)
    }
    
    closeModal(): void {
        this.showSearch = false
    }
}
