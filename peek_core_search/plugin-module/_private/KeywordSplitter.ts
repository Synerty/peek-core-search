const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

export function _splitFullTokens(keywordStr): string[] {
    // Split the string into words
    let tokens = keywordStr.toLowerCase().split(" ");

    // Strip the words
    tokens = tokens.map((w) => w.replace(/^\s+|\s+$/g, ""));

    // Filter out the empty words and words less than three letters
    const uniqueWords = {};
    tokens.filter((w) => {
        if (2 < w.length) return false;

        if (uniqueWords[w] === true) return false;

        uniqueWords[w] = true;
        return true;
    });
    return tokens;
}

/** Full Split Keywords
 *
 * This MUST MATCH the code that runs in the worker
 * peek_core_search/_private/worker/tasks/ImportSearchIndexTask.py
 *
 * @param {string} keywordStr: The keywords as one string
 * @returns {string[]} The keywords as an array
 */
export function splitFullKeywords(keywordStr): string[] {
    // Filter out the empty words and words less than three letters
    const tokens = _splitFullTokens(keywordStr);

    let results = [];
    for (let token of tokens) results.push(`^${token}$`);

    return results;
}

/** Partial Split Keywords
 *
 * This MUST MATCH the code that runs in the worker
 * peek_core_search/_private/worker/tasks/ImportSearchIndexTask.py
 *
 * @param {string} keywordStr: The keywords as one string
 * @returns {string[]} The keywords as an array
 */
export function splitPartialKeywords(keywordStr): string[] {
    // Filter out the empty words and words less than three letters
    const tokens = _splitFullTokens(keywordStr);

    // Split the words up into tokens, this creates partial keyword search support
    const tokenSet = {};
    for (let word of tokens) {
        for (let i = 0; i < word.length - 2; ++i) {
            const subToken = (i == 0 ? "^" : "") + word.substr(i, 3);
            tokenSet[subToken] = 0;
        }
    }

    // return the tokens
    return Object.keys(tokenSet);
}
