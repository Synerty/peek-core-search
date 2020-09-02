import {Component, OnInit} from "@angular/core";
import { BalloonMsgService } from "@synerty/peek-plugin-base-js"
import {
    extend,
    VortexService,
    ComponentLifecycleEventEmitter,
    TupleLoader
} from "@synerty/vortexjs";
import {SearchPropertyTuple, searchFilt} from "@peek/peek_core_search/_private";


@Component({
    selector: 'pl-search-edit-property',
    templateUrl: './edit.component.html'
})
export class EditPropertyComponent extends ComponentLifecycleEventEmitter {
    // This must match the dict defined in the admin_backend handler
    private readonly filt = {
        "key": "admin.Edit.SearchPropertyTuple"
    };

    items: SearchPropertyTuple[] = [];

    loader: TupleLoader;

    constructor(private balloonMsg: BalloonMsgService,
                vortexService: VortexService) {
        super();

        this.loader = vortexService.createTupleLoader(
            this, () => extend({}, this.filt, searchFilt)
        );

        this.loader.observable
            .subscribe((tuples:SearchPropertyTuple[]) => this.items = tuples);
    }

    save() {
        this.loader.save()
            .then(() => this.balloonMsg.showSuccess("Save Successful"))
            .catch(e => this.balloonMsg.showError(e));
    }

    resetClicked() {
        this.loader.load()
            .then(() => this.balloonMsg.showSuccess("Reset Successful"))
            .catch(e => this.balloonMsg.showError(e));
    }


}
