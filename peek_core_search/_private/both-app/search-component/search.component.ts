import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
} from "@angular/core"
import { NavigationEnd, Router } from "@angular/router"
import { filter } from "rxjs/operators"

// This is a root/global component
@Component({
    selector: "core-search-component",
    templateUrl: "search.component.html",
    styleUrls: ["search.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
    @Output("showSearchChange")
    showSearchChange = new EventEmitter()
    
    constructor(
        public router: Router,
    ) {
        this.router.events
            .pipe(
                filter((e) =>
                    e instanceof NavigationEnd
                    && this.showSearch
                )
            )
            .subscribe(() => this.closeModal())
    }
    
    private _showSearch = false
    
    @Input("showSearch")
    get showSearch() {
        return this._showSearch
    }
    
    set showSearch(val) {
        this._showSearch = val
        this.showSearchChange.emit(val)
    }
    
    closeModal(): void {
        this.showSearch = false
    }
}
