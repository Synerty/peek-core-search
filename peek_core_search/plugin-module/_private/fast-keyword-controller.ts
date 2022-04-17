import {
    _splitFullTokens,
    splitFullKeywords,
    splitPartialKeywords,
} from "@peek/peek_core_search/_private/KeywordSplitter";
import { PrivateSearchIndexLoaderService } from "@peek/peek_core_search/_private/search-index-loader";
import { PrivateSearchObjectLoaderService } from "@peek/peek_core_search/_private/search-object-loader";
import { SearchResultObjectTuple } from "@peek/peek_core_search";

export class FastKeywordController {
    constructor(
        private searchIndexLoader: PrivateSearchIndexLoaderService,
        private searchObjectLoader: PrivateSearchObjectLoaderService
    ) {}

    /** Get Locations
     *
     * Get the objects with matching keywords from the index..
     *
     */
    async getObjects(
        propertyName: string | null,
        objectTypeId: number | null,
        keywordsString: string
    ): Promise<SearchResultObjectTuple[]> {
        // If we do have offline support
        const objectIds: number[] = await this.getObjectIdsForSearchString(
            keywordsString,
            propertyName
        );

        if (objectIds.length == 0) {
            console.log(
                "There were no keyword search results for : " + keywordsString
            );
            return [];
        }

        let results: SearchResultObjectTuple[] =
            await this.searchObjectLoader.getObjects(objectTypeId, objectIds);

        results = this.filterAndRankObjectsForSearchString(
            results,
            keywordsString,
            propertyName
        );

        results = results.slice(0, 50);

        console.debug(
            `Completed search for |${keywordsString}|` +
                `, returning ${results.length} objects`
        );

        return results;
    }

    /** Get Object IDs When Ready
     *
     * Get the objects with matching keywords from the index..
     *
     * This should match FastKeywordController.py
     */
    private async getObjectIdsForSearchString(
        searchString: string,
        propertyName: string | null
    ): Promise<number[]> {
        console.log(`Started search with string |${searchString}|`);

        // ---------------
        // Search for fulls
        const fullKwTokens = splitFullKeywords(searchString);

        console.log(`Searching for full tokens |${fullKwTokens}|`);

        // If there are no tokens then return nothing
        if (fullKwTokens == null || fullKwTokens.length == 0) {
            return [];
        }

        // First find all the results from the full kw tokens
        const resultsByFullKw: { [token: string]: number[] } =
            await this.searchIndexLoader.getObjectIds(
                fullKwTokens,
                propertyName
            );

        // Filter out the no matches
        for (let token of Object.keys(resultsByFullKw)) {
            if (!resultsByFullKw[token]?.length) delete resultsByFullKw[token];
        }

        console.log(
            `Found results for full tokens |${Object.keys(resultsByFullKw)}|`
        );

        // ---------------
        // Search for partials
        const partialTokens = splitPartialKeywords(searchString);
        console.log(`Searching for partial tokens |${partialTokens}|`);

        // Now lookup any remaining keywords, if any
        const resultsByPartialKw: { [token: string]: number[] } =
            await this.searchIndexLoader.getObjectIds(
                partialTokens,
                propertyName
            );

        // Filter out the no matches
        for (let token of Object.keys(resultsByPartialKw)) {
            if (!resultsByPartialKw[token]?.length)
                delete resultsByPartialKw[token];
        }

        console.log(
            `Found results for partial tokens |${Object.keys(
                resultsByPartialKw
            )}|`
        );

        // ---------------
        // Process the results

        // Merge partial kw results with full kw results.
        const resultsByKw = this._mergePartialAndFullMatches(
            searchString,
            resultsByFullKw,
            resultsByPartialKw
        );

        console.log(`Merged tokens |${Object.keys(resultsByKw)}|`);

        // Now, return the ObjectIDs that exist in all keyword lookups
        const objectIdsList = this._setIntersectFilterIndexResults(resultsByKw);

        // Limit to 50 and return
        return objectIdsList;
    }

    /** Rank and Filter Objects For Search String
     
     STAGE 2 of the search.
     
     This method filters the loaded objects to ensure we have full matches.
     
     :param results:
     :param searchString:
     :param propertyName:
     :return:
     */
    private filterAndRankObjectsForSearchString(
        results: SearchResultObjectTuple[],
        searchString: string,
        propertyName: string | null
    ): SearchResultObjectTuple[] {
        // Get the partial tokens, and match them
        const splitWords = searchString.toLowerCase().split(" ");

        const rankResult = (result: SearchResultObjectTuple): boolean => {
            let props = result.properties;
            if (propertyName != null && propertyName.length !== 0) {
                props = {};
                if (props.hasOwnProperty(propertyName))
                    props[propertyName] = props[propertyName];
            }

            const allPropVals =
                " " + Object.values(props).join(" ").toLowerCase();

            const matchedTokens = splitWords //
                .filter((w) => allPropVals.indexOf(" " + w) !== -1);

            if (matchedTokens.length < splitWords.length) {
                return false;
            }

            result.rank = 0;
            for (const p of allPropVals.split(" ")) {
                for (const w of splitWords) {
                    if (p.indexOf(w) === 0) result.rank += p.length - w.length;
                }
            }

            return true;
        };

        // Filter and set the rank
        return results //
            .filter(rankResult)
            .sort((a, b) => a.rank - b.rank);
    }

    /** Merge Partial
     */
    private _mergePartialAndFullMatches(
        searchString: string,
        resultsByFullKw: { [key: string]: number[] },
        resultsByPartialKw: { [key: string]: number[] }
    ): { [key: string]: number[] } {
        // Copy this, because we want to modify it and don't want to affect other logic
        const resultsByPartialKwSet = Object.keys(resultsByPartialKw);

        const mergedResultsByKw = {};

        for (let fullKw of Object.keys(resultsByFullKw)) {
            const fullObjectIds = resultsByFullKw[fullKw];

            // Merge in full
            fullKw = fullKw.replace(/^\^|\$$/g, "");
            let existing = mergedResultsByKw[fullKw] || [];

            // Include the fulls
            existing = [...existing, ...fullObjectIds];

            mergedResultsByKw[fullKw] = existing;
        }

        const tokens = _splitFullTokens(searchString);
        for (let token of tokens) {
            let existing = mergedResultsByKw[token] || [];
            const partialKws = splitPartialKeywords(token);

            if (!(partialKws.length <= resultsByPartialKwSet.length)) continue;

            // Union all
            let objectIdsForToken = resultsByPartialKw[partialKws.pop()];
            while (partialKws.length !== 0) {
                const newSet = new Set(resultsByPartialKw[partialKws.pop()]);
                objectIdsForToken = objectIdsForToken //
                    .filter((x) => newSet.has(x));
            }

            existing = [...existing, ...objectIdsForToken];

            mergedResultsByKw[token] = existing;
        }

        // Strip out the duplicates,
        // we need this in Javascript because in Python use sets for "existing"
        for (const key of Object.keys(mergedResultsByKw)) {
            mergedResultsByKw[key] = [...new Set(mergedResultsByKw[key])];
        }

        return mergedResultsByKw;
    }

    private _setIntersectFilterIndexResults(objectIdsByKw: {
        [key: string]: number[];
    }): number[] {
        if (Object.keys(objectIdsByKw).length === 0) return [];

        let keys = Object.keys(objectIdsByKw);

        const twoCharTokensSet = new Set(keys.filter((t) => t.length == 2));
        keys = keys.filter((i) => !twoCharTokensSet.has(i));

        const twoCharTokens_ = [...twoCharTokensSet];

        // Now, return the ObjectIDs that exist in all keyword lookups
        let objectIdsList;
        if (keys?.length) {
            objectIdsList = objectIdsByKw[keys.pop()];
        } else {
            objectIdsList = objectIdsByKw[twoCharTokens_.pop()];
        }

        while (keys.length !== 0) {
            const newSet = new Set(objectIdsByKw[keys.pop()]);
            objectIdsList = objectIdsList //
                .filter((x) => newSet.has(x));
        }

        // Optionally, include two char tokens, if any exist.
        // The goal of this is to NOT show zero results
        // if a two-letter token doesn't match
        while (twoCharTokens_.length !== 0) {
            const newSet = new Set(objectIdsByKw[twoCharTokens_.pop()]);
            const objectIdsUnionNoTwoChars = objectIdsList //
                .filter((x) => newSet.has(x));

            if (objectIdsUnionNoTwoChars?.length !== 0) {
                objectIdsList = objectIdsUnionNoTwoChars;
            }
        }

        return objectIdsList;
    }
}
