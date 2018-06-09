import {Component, OnInit} from "@angular/core";
import {Ng2BalloonMsgService} from "@synerty/ng2-balloon-msg";
import {
    extend,
    VortexService,
    ComponentLifecycleEventEmitter,
    TupleLoader
} from "@synerty/vortexjs";
import {SearchObjectTypeTuple, searchFilt} from "@peek/peek_plugin_search/_private";


@Component({
    selector: 'pl-search-edit-object-type',
    templateUrl: './edit.component.html'
})
export class EditObjectTypeComponent extends ComponentLifecycleEventEmitter {
    // This must match the dict defined in the admin_backend handler
    private readonly filt = {
        "key": "admin.Edit.SearchObjectTypeTuple"
    };

    items: SearchObjectTypeTuple[] = [];

    loader: TupleLoader;

    constructor(private balloonMsg: Ng2BalloonMsgService,
                vortexService: VortexService) {
        super();

        this.loader = vortexService.createTupleLoader(
            this, () => extend({}, this.filt, searchFilt)
        );

        this.loader.observable
            .subscribe((tuples:SearchObjectTypeTuple[]) => this.items = tuples);
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