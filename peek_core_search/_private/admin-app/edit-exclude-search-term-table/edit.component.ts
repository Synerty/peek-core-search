import { Component } from "@angular/core";
import { BalloonMsgService } from "@synerty/peek-plugin-base-js";
import {
    extend,
    NgLifeCycleEvents,
    TupleLoader,
    VortexService,
} from "@synerty/vortexjs";
import { searchFilt } from "@peek/peek_core_search/_private";
import { ExcludeSearchStringTable } from "../tuples/ExcludeSearchStringTable";

@Component({
    selector: "pl-search-edit-exclude-search-term",
    templateUrl: "./edit.component.html",
})
export class EditExcludeSearchTermComponent extends NgLifeCycleEvents {
    items: ExcludeSearchStringTable[] = [];
    itemsToDelete: ExcludeSearchStringTable[] = [];
    loader: TupleLoader;
    // This must match the dict defined in the admin_backend handler
    private readonly filt = {
        key: "admin.Edit.ExcludeSearchStringTableHandler",
    };

    constructor(
        private balloonMsg: BalloonMsgService,
        vortexService: VortexService
    ) {
        super();

        this.loader = vortexService.createTupleLoader(this, () =>
            extend({}, this.filt, searchFilt)
        );

        this.loader.observable.subscribe(
            (tuples: ExcludeSearchStringTable[]) => (this.items = tuples)
        );
    }

    save() {
        for (const item of this.items) {
            item.term = item.term.toLowerCase();
        }

        let itemsToDelete = this.itemsToDelete;

        this.loader
            .save(this.items)
            .then(() => {
                if (itemsToDelete.length != 0) {
                    return this.loader.del(itemsToDelete);
                }
            })
            .then(() => this.balloonMsg.showSuccess("Save Successful"))
            .catch((e) => this.balloonMsg.showError(e));
    }

    load() {
        this.loader
            .load()
            .then(() => this.balloonMsg.showSuccess("Reset Successful"))
            .catch((e) => this.balloonMsg.showError(e));
    }

    addRow() {
        this.items.push(new ExcludeSearchStringTable());
    }

    removeRow(item: ExcludeSearchStringTable) {
        if (item.id != null) this.itemsToDelete.push(item);

        let index: number = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }
}
