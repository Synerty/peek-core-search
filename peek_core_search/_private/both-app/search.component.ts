import {Component} from "@angular/core";
import {TitleService} from "@synerty/peek-util";

@Component({
    selector: 'plugin-search',
    templateUrl: 'search.component.web.html',
    moduleId: module.id
})
export class SearchComponent {

    constructor(titleService:TitleService) {
        titleService.setTitle("Unified Search");
    }

}
