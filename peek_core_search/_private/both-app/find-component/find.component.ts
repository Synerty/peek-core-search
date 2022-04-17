import { BehaviorSubject, Subject } from "rxjs";
import { ChangeDetectionStrategy, Component, OnInit } from "@angular/core";
import {
    SearchObjectTypeTuple,
    SearchResultObjectTuple,
    SearchService,
} from "@peek/peek_core_search";
import {
    SearchPropertyTuple,
    SearchTupleService,
} from "@peek/peek_core_search/_private";
import { BalloonMsgService } from "@synerty/peek-plugin-base-js";
import {
    NgLifeCycleEvents,
    TupleSelector,
    VortexStatusService,
} from "@synerty/vortexjs";
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    takeUntil,
} from "rxjs/operators";
import { DeviceOfflineCacheControllerService } from "@peek/peek_core_device";

import { zip } from "rxjs";
import { map } from "rxjs/operators";

@Component({
    selector: "find-component",
    templateUrl: "find.component.html",
    styleUrls: ["find.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindComponent extends NgLifeCycleEvents implements OnInit {
    searchString: string = "";
    resultObjects$ = new BehaviorSubject<SearchResultObjectTuple[]>([]);
    searchInProgress$ = new BehaviorSubject<boolean>(false);
    searchProperties: SearchPropertyTuple[] = [];
    searchPropertyStrings: string[] = [];
    searchProperty: SearchPropertyTuple = new SearchPropertyTuple();
    searchObjectTypes: SearchObjectTypeTuple[] = [];
    searchObjectTypeStrings: string[] = [];
    searchObjectType: SearchObjectTypeTuple = new SearchObjectTypeTuple();
    optionsShown$ = new BehaviorSubject<boolean>(false);
    firstSearchHasRun$ = new BehaviorSubject<boolean>(false);

    searchNotAvailable$ = new BehaviorSubject<boolean>(false);

    private readonly ALL = "All";
    private performAutoCompleteSubject: Subject<string> = new Subject<string>();

    constructor(
        private vortexStatusService: VortexStatusService,
        private searchService: SearchService,
        private balloonMsg: BalloonMsgService,
        private tupleService: SearchTupleService,
        private deviceCacheControllerService: DeviceOfflineCacheControllerService
    ) {
        super();
        this.searchProperty.title = this.ALL;
        this.searchObjectType.title = this.ALL;

        zip(
            this.vortexStatusService.isOnline,
            this.deviceCacheControllerService.offlineModeEnabled$
        )
            .pipe(map((values) => !values[0] && !values[1]))
            .subscribe((state) => this.searchNotAvailable$.next(state));
    }

    get resultObjects() {
        return this.resultObjects$.getValue();
    }

    set resultObjects(value) {
        this.resultObjects$.next(value);
    }

    get searchInProgress() {
        return this.searchInProgress$.getValue();
    }

    set searchInProgress(value) {
        this.searchInProgress$.next(value);
    }

    get optionsShown() {
        return this.optionsShown$.getValue();
    }

    set optionsShown(value) {
        this.optionsShown$.next(value);
    }

    get firstSearchHasRun() {
        return this.firstSearchHasRun$.getValue();
    }

    set firstSearchHasRun(value) {
        this.firstSearchHasRun$.next(value);
    }

    get getSearchPropertyName(): string | null {
        const prop = this.searchProperty;
        if (prop.title != this.ALL && prop.name != null && prop.name.length) {
            return prop.name;
        }
        return null;
    }

    get getSearchObjectTypeId(): number | null {
        const objProp = this.searchObjectType;
        if (
            objProp.title != this.ALL &&
            objProp.name != null &&
            objProp.name.length
        ) {
            return objProp.id;
        }
        return null;
    }

    ngOnInit() {
        const propTs = new TupleSelector(SearchPropertyTuple.tupleName, {});
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(propTs)
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((v: SearchPropertyTuple[]) => {
                this.updateSearchProperties(v);
            });

        const objectTypeTs = new TupleSelector(
            SearchObjectTypeTuple.tupleName,
            {}
        );
        this.tupleService.offlineObserver
            .subscribeToTupleSelector(objectTypeTs)
            .pipe(takeUntil(this.onDestroyEvent))
            .subscribe((v: SearchObjectTypeTuple[]) => {
                this.updateSearchObjectTypes(v);

                // Update result objects
                if (this.resultObjects.length) {
                    this.performAutoComplete();
                }
            });

        // Wait 500ms after the last event before emitting last event
        // Only emit if value is different from previous value
        this.performAutoCompleteSubject
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.onDestroyEvent)
            )
            .subscribe(() => this.performAutoComplete());

        this.vortexStatusService.isOnline
            .pipe(
                takeUntil(this.onDestroyEvent),
                filter((online) => online)
            )
            .subscribe(() => this.performAutoComplete());
    }

    resetSearch(): void {
        this.searchString = "";
        this.resultObjects = [];
        this.firstSearchHasRun = false;
        this.searchInProgress = false;
    }

    searchKeywordOnChange($event): void {
        this.searchString = $event;
        this.performAutoCompleteSubject.next($event);
    }

    searchPropertyOnChange($event): void {
        this.searchProperty = $event;
        this.performAutoComplete();
    }

    searchObjectTypesOnChange($event): void {
        this.searchObjectType = $event;
        this.performAutoComplete();
    }

    private updateSearchProperties(v: SearchPropertyTuple[]): void {
        // Create the empty item
        const all = new SearchPropertyTuple();
        all.title = "All";

        if (this.searchProperty.title === all.title) {
            this.searchProperty = all;
        }

        // Update the search objects
        this.searchProperties = [...v];
        this.searchProperties.splice(0, 0, all);

        // Set the string array and lookup by id
        this.searchPropertyStrings = [];

        for (const item of this.searchProperties) {
            this.searchPropertyStrings.push(item.title);
        }
    }

    private updateSearchObjectTypes(v: SearchObjectTypeTuple[]): void {
        // Create the empty item
        const all = new SearchObjectTypeTuple();
        all.title = "All";

        if (this.searchObjectType.title === all.title) {
            this.searchObjectType = all;
        }

        // Update the search objects
        this.searchObjectTypes = [...v];
        this.searchObjectTypes.splice(0, 0, all);

        // Set the string array, and object type lookup
        this.searchObjectTypeStrings = [];

        for (const item of this.searchObjectTypes) {
            this.searchObjectTypeStrings.push(item.title);
        }
    }

    private performAutoComplete(): void {
        const check = () => {
            if (this.searchString == null || this.searchString.length === 0) {
                return false;
            }

            if (this.searchString.length < 3) {
                return false;
            }

            return true;
        };

        if (!check()) {
            this.resultObjects = [];
            return;
        }

        this.searchInProgress = true;
        this.searchService
            .getObjects(
                this.getSearchPropertyName,
                this.getSearchObjectTypeId,
                this.searchString
            )
            .then((results: SearchResultObjectTuple[]) => {
                this.resultObjects = results;
            })
            .catch((e: string) => {
                this.balloonMsg.showError(`Find Failed:${e}`);
            })
            .then(() => {
                this.searchInProgress = false;
                this.firstSearchHasRun = true;
            });
    }
}
