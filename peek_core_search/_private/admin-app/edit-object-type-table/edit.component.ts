import { Component } from "@angular/core"
import { BalloonMsgService } from "@synerty/peek-plugin-base-js"
import {
    extend,
    NgLifeCycleEvents,
    TupleLoader,
    VortexService
} from "@synerty/vortexjs"
import { searchFilt } from "@peek/peek_core_search/_private"
import { SearchObjectTypeTuple } from "@peek/peek_core_search"

@Component({
    selector: "pl-search-edit-object-type",
    templateUrl: "./edit.component.html"
})
export class EditObjectTypeComponent extends NgLifeCycleEvents {
    items: SearchObjectTypeTuple[] = []
    loader: TupleLoader
    // This must match the dict defined in the admin_backend handler
    private readonly filt = {
        "key": "admin.Edit.SearchObjectTypeTuple"
    }
    
    constructor(
        private balloonMsg: BalloonMsgService,
        vortexService: VortexService
    ) {
        super()
        
        this.loader = vortexService.createTupleLoader(
            this, () => extend({}, this.filt, searchFilt)
        )
        
        this.loader.observable
            .subscribe((tuples: SearchObjectTypeTuple[]) => this.items = tuples)
    }
    
    save() {
        this.loader.save()
            .then(() => this.balloonMsg.showSuccess("Save Successful"))
            .catch(e => this.balloonMsg.showError(e))
    }
    
    resetClicked() {
        this.loader.load()
            .then(() => this.balloonMsg.showSuccess("Reset Successful"))
            .catch(e => this.balloonMsg.showError(e))
    }
    
}
