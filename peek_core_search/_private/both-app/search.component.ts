import {Component, EventEmitter, Input, Output} from "@angular/core";
import {DocDbPopupService, DocDbPopupTypeE, DocDbPopupClosedReasonE} from "@peek/peek_plugin_docdb";

@Component({
    selector: 'plugin-search',
    templateUrl: 'search.component.web.html',
    styleUrls: ["search.component.web.scss"],
    moduleId: module.id
})
export class SearchComponent { // This is a root/global component
    private _showSearch = false;

    constructor(private objectPopupService: DocDbPopupService) {

        this.objectPopupService
            .popupClosedObservable(DocDbPopupTypeE.summaryPopup)
            .filter(reason => reason == DocDbPopupClosedReasonE.userClickedAction)
            .subscribe(() => this.showSearch = false);

        this.objectPopupService
            .popupClosedObservable(DocDbPopupTypeE.detailPopup)
            .filter(reason => reason == DocDbPopupClosedReasonE.userClickedAction)
            .subscribe(() => this.showSearch = false);
    }


    @Output("showSearchChange") showSearchChange = new EventEmitter();

    @Input("showSearch")
    get showSearch() {
        return this._showSearch;
    }

    set showSearch(val) {
        // Hide the tooltip when the search panel is closed
        this.objectPopupService.hidePopup(DocDbPopupTypeE.tooltipPopup);
        this._showSearch = val;
        this.showSearchChange.emit(val);
    }

}
