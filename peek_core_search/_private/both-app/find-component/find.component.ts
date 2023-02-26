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
import { DeviceOfflineCacheService } from "@peek/peek_core_device";

import { zip } from "rxjs";
import { map } from "rxjs/operators";

@Component({
    selector: "find-component",
    templateUrl: "find.component.html",
    styleUrls: ["find.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindComponent extends NgLifeCycleEvents implements OnInit {
    _searchString: string = "";
    resultObjects$ = new BehaviorSubject<SearchResultObjectTuple[]>([]);
    searchInProgress$ = new BehaviorSubject<boolean>(false);
    searchProperties: SearchPropertyTuple[] = [];
    searchPropertyStrings: string[] = [];
    _searchProperty: SearchPropertyTuple = new SearchPropertyTuple();
    searchObjectTypes: SearchObjectTypeTuple[] = [];
    searchObjectTypeStrings: string[] = [];
    _searchObjectType: SearchObjectTypeTuple = new SearchObjectTypeTuple();
    optionsShown$ = new BehaviorSubject<boolean>(false);
    firstSearchHasRun$ = new BehaviorSubject<boolean>(false);

    searchNotAvailable$ = new BehaviorSubject<boolean>(false);
    notEnoughTokens$ = new BehaviorSubject<boolean>(false);

    private readonly ALL = "All";
    private performAutoCompleteSubject: Subject<string> = new Subject<string>();

    constructor(
        private vortexStatusService: VortexStatusService,
        private searchService: SearchService,
        private balloonMsg: BalloonMsgService,
        private tupleService: SearchTupleService,
        private deviceCacheControllerService: DeviceOfflineCacheService
    ) {
        super();
        this._searchProperty.title = this.ALL;
        this._searchObjectType.title = this.ALL;

        zip(
            this.vortexStatusService.isOnline,
            this.searchService.canSearchOffline$
        )
            .pipe(map((values) => !values[0] && !values[1]))
            .subscribe((state) => this.searchNotAvailable$.next(state));
    }

    get searchString() {
        return this._searchString;
    }

    set searchString(value: string) {
        this._searchString = value;
        this.notEnoughTokens$.next(
            !this.searchService.haveEnoughSearchKeywords(value)
        );

        if (this.notEnoughTokens$.getValue()) {
            return;
        }

        this.performAutoComplete();
        this.performAutoCompleteSubject.next(value);
    }

    get searchProperty() {
        return this._searchProperty;
    }

    set searchProperty(value: SearchPropertyTuple) {
        this._searchProperty = value;
        this.performAutoComplete();
    }

    get searchObjectType() {
        return this._searchObjectType;
    }

    set searchObjectType(value: SearchObjectTypeTuple) {
        this._searchObjectType = value;
        this.performAutoComplete();
    }

    get resultObjects() {
        return this.resultObjects$.getValue();
    }

    set resultObjects(value: SearchResultObjectTuple[]) {
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
        const prop = this._searchProperty;
        if (prop.title != this.ALL && prop.name != null && prop.name.length) {
            return prop.name;
        }
        return null;
    }

    get getSearchObjectTypeId(): number | null {
        const objProp = this._searchObjectType;
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
        this._searchString = "";
        this.resultObjects = [];
        this.firstSearchHasRun = false;
        this.searchInProgress = false;
    }

    private updateSearchProperties(v: SearchPropertyTuple[]): void {
        // Create the empty item
        const all = new SearchPropertyTuple();
        all.title = "All";

        if (this._searchProperty.title === all.title) {
            this._searchProperty = all;
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

        if (this._searchObjectType.title === all.title) {
            this._searchObjectType = all;
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
            if (this._searchString == null || this._searchString.length === 0) {
                return false;
            }

            if (this._searchString.length < 3) {
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
                this._searchString
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
