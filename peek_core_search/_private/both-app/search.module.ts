import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {NzModalModule} from 'ng-zorro-antd/modal';
import {PeekModuleFactory} from "@synerty/peek-util-web";
import {SearchComponent} from "./search.component";
import {FindComponent} from "./find-component/find.component";
import {ResultComponent} from "./result-component/result.component";
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzAlertModule} from 'ng-zorro-antd/alert';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzTabsModule} from 'ng-zorro-antd/tabs';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzTableModule} from 'ng-zorro-antd/table';

@NgModule({
    imports: [
        CommonModule,
        ...PeekModuleFactory.FormsModules,
        NzModalModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzAlertModule,
        NzSpinModule,
        NzButtonModule,
        NzTabsModule,
        NzGridModule,
        NzTableModule
    ],
    exports: [SearchComponent],
    providers: [],
    declarations: [SearchComponent, FindComponent, ResultComponent]
})
export class SearchModule {
}
